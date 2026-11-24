const prisma = require("../../lib/prisma");
const traccar = require("../../lib/traccar");
const { readSettings } = require("../settings/settings.controller");
const { computeAllowedKm } = require("../contracts/contract-fields");
const { wallToInstant, haversineKm } = require("./telematics.shared");
const { gpsSettings, timeBucket, kmLimitLevel, createAlert, flushAlertEmails } = require("./telematics.alerts");

// GPS takip Faz 3: the periodic check ("tick") and km syncing.
//
// The tick runs every few minutes, called by a timer on the GPS server
// (POST /api/telematics/tick with the webhook secret). One run:
//   1. reads every tracked vehicle's latest position from Traccar,
//   2. syncs km, ignition, last-seen and "at the office" onto the vehicle
//      (no coordinates are stored),
//   3. opens alerts: towing, arrival at the office, out of region, km limit,
//      maintenance, device offline, late return,
//   4. e-mails new critical/warning alerts.
// Rented vehicles are processed automatically like the rest; nobody sees
// their location from this, only the alert texts.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
// A reading this recent (or taken after the engine was switched off) is
// trusted for calibrating against a dashboard km typed in at the counter.
const CALIBRATION_FRESH_MS = 15 * MINUTE;
// A position older than this doesn't count as "moving now" for towing.
const TOW_FRESH_MS = 15 * MINUTE;
const TOW_MIN_SPEED_KMH = 20;

const KM_SELECT = {
  currentKm: true,
  trackerOdometerKm: true,
  trackerOdometerAt: true,
  trackerKmOffset: true,
  trackerKmAnchorKm: true,
  trackerIgnitionOn: true,
};

// --------------------------------------------------------------- km logic

// A new raw device reading -> what to write. The device counts its own km
// from installation (GPS distance), so the dashboard value is raw + offset.
// The offset is set from a dashboard km waiting for a reading (anchor), or,
// on the very first reading, from the vehicle's current km. currentKm only
// ever moves up: a lower estimate means the dashboard was entered higher.
const computeKmSync = (vehicle, rawKm, readingAt, now = new Date()) => {
  if (!Number.isFinite(rawKm)) return null;
  const data = { trackerOdometerKm: rawKm, trackerOdometerAt: readingAt || now };
  let offset = vehicle.trackerKmOffset;
  if (vehicle.trackerKmAnchorKm != null) {
    offset = vehicle.trackerKmAnchorKm - rawKm;
    Object.assign(data, { trackerKmOffset: offset, trackerKmAnchorKm: null, trackerKmCalibratedAt: now });
  } else if (offset == null) {
    offset = (vehicle.currentKm ?? rawKm) - rawKm;
    Object.assign(data, { trackerKmOffset: offset, trackerKmCalibratedAt: now });
  }
  const estimatedKm = rawKm + offset;
  if (vehicle.currentKm == null || estimatedKm > vehicle.currentKm) data.currentKm = estimatedKm;
  return { data, estimatedKm };
};

// A dashboard km typed in by staff (return, vehicle swap, vehicle form) ->
// recalibrate. If the last device reading is fresh, or was taken with the
// engine off (parked since), use it now; otherwise wait for the next reading.
const manualKmCalibration = (vehicle, km, now = new Date()) => {
  if (!Number.isFinite(km)) return null;
  const at = vehicle.trackerOdometerAt ? new Date(vehicle.trackerOdometerAt) : null;
  const fresh =
    vehicle.trackerOdometerKm != null &&
    at &&
    (vehicle.trackerIgnitionOn === false || now.getTime() - at.getTime() <= CALIBRATION_FRESH_MS);
  return fresh
    ? { trackerKmOffset: km - vehicle.trackerOdometerKm, trackerKmAnchorKm: null, trackerKmCalibratedAt: now }
    : { trackerKmAnchorKm: km };
};

// Called (inside the same transaction) wherever staff save a dashboard km.
// A vehicle without a tracker is left alone.
const noteManualKm = async (client, vehicleId, km, now = new Date()) => {
  if (!vehicleId || km == null || !Number.isFinite(Number(km))) return;
  const vehicle = await client.vehicle.findUnique({
    where: { id: vehicleId },
    select: { trackerImei: true, ...KM_SELECT },
  });
  if (!vehicle?.trackerImei) return;
  const data = manualKmCalibration(vehicle, Number(km), now);
  if (data) await client.vehicle.update({ where: { id: vehicleId }, data });
};

// Applies one normalized Traccar position's odometer to a vehicle (webhook,
// km suggestion). Returns the estimated dashboard km, or null.
const syncKmFromPosition = async (vehicleId, pos, now = new Date()) => {
  if (!pos || pos.odometerKm == null) return null;
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: KM_SELECT });
  if (!vehicle) return null;
  const readingAt = pos.fixTime ? new Date(pos.fixTime) : now;
  if (vehicle.trackerOdometerAt && readingAt < vehicle.trackerOdometerAt) {
    // An older reading than the one we have (late webhook): estimate only.
    return vehicle.trackerKmOffset != null ? pos.odometerKm + vehicle.trackerKmOffset : null;
  }
  const result = computeKmSync(vehicle, pos.odometerKm, readingAt, now);
  if (!result) return null;
  await prisma.vehicle.update({ where: { id: vehicleId }, data: result.data });
  return result.estimatedKm;
};

// ------------------------------------------------------------------ tick

const laterOf = (...dates) =>
  dates.filter(Boolean).map((d) => new Date(d)).sort((a, b) => b - a)[0] || null;

// Traccar raises "deviceOverspeed" from each device's speedLimit attribute
// (knots). Keep it equal to the Ayarlar value.
const reconcileSpeedLimits = async (devices, overspeedKmh) => {
  const knots = Math.round((overspeedKmh / 1.852) * 100) / 100;
  let updated = 0;
  for (const device of devices) {
    const attrs = device.attributes || {};
    if (Number(attrs.speedLimit) === knots) continue;
    try {
      await traccar.updateDevice({ ...device, attributes: { ...attrs, speedLimit: knots } });
      updated += 1;
    } catch (err) {
      console.error(`[telematics] speedLimit for device ${device.id} failed:`, err.message);
    }
  }
  return updated;
};

const runTick = async ({ now = new Date() } = {}) => {
  const cfg = gpsSettings(await readSettings());
  const summary = { vehicles: 0, positions: 0, kmUpdated: 0, alerts: 0, emailed: 0, traccarError: null };
  const opened = [];
  const open = async (alert) => {
    const row = await createAlert(alert);
    if (row) opened.push(row);
  };

  const vehicles = await prisma.vehicle.findMany({
    where: { soldAt: null, trackerImei: { not: null } },
    select: {
      id: true,
      licensePlate: true,
      outOfService: true,
      passiveAt: true,
      trackMaintenance: true,
      trackerImei: true,
      trackerLastSeenAt: true,
      trackerAtOffice: true,
      ...KM_SELECT,
    },
  });
  summary.vehicles = vehicles.length;

  let devices = [];
  let positions = [];
  if (!vehicles.length) {
    // nothing to read
  } else if (!traccar.isConfigured()) {
    summary.traccarError = "TRACCAR_NOT_CONFIGURED";
  } else {
    try {
      [devices, positions] = await Promise.all([traccar.listDevices(), traccar.latestPositions()]);
    } catch (err) {
      summary.traccarError = err.code || "TRACCAR_ERROR";
    }
  }
  const deviceByUid = new Map((devices || []).map((d) => [d.uniqueId, d]));
  const positionByDevice = new Map((positions || []).map((p) => [p.deviceId, p]));
  const ids = vehicles.map((v) => v.id);

  // Rentals in progress on these cars: started (pick-up in the past, real
  // time), not closed. Keyed by car; the latest pick-up wins.
  const openContracts = ids.length
    ? await prisma.contract.findMany({
        where: { carId: { in: ids }, status: { notIn: ["CANCELLED", "DONE"] }, returnedAt: null },
        select: {
          id: true,
          contractNo: true,
          carId: true,
          pickUpTime: true,
          dropOffTime: true,
          pickUpKm: true,
          rentalType: true,
          dailyKmLimit: true,
          monthlyKmLimit: true,
          unlimitedKm: true,
        },
      })
    : [];
  const rentalByCar = new Map();
  for (const c of openContracts) {
    if (wallToInstant(c.pickUpTime) > now) continue;
    const current = rentalByCar.get(c.carId);
    if (!current || c.pickUpTime > current.pickUpTime) rentalByCar.set(c.carId, c);
  }

  if (summary.traccarError == null && devices.length) {
    const ours = devices.filter((d) => vehicles.some((v) => v.trackerImei === d.uniqueId));
    await reconcileSpeedLimits(ours, cfg.overspeedKmh);
  }

  for (const v of vehicles) {
    const device = deviceByUid.get(v.trackerImei) || null;
    const raw = device ? positionByDevice.get(device.id) : null;
    const pos = traccar.normalizePosition(raw);
    const rental = rentalByCar.get(v.id) || null;
    const updates = {};

    if (pos) {
      summary.positions += 1;
      const fixAt = pos.fixTime ? new Date(pos.fixTime) : null;

      if (pos.odometerKm != null && (!v.trackerOdometerAt || !fixAt || fixAt >= v.trackerOdometerAt)) {
        const km = computeKmSync(v, pos.odometerKm, fixAt, now);
        if (km) {
          if (km.data.currentKm != null) summary.kmUpdated += 1;
          Object.assign(updates, km.data);
          Object.assign(v, km.data);
        }
      }
      if (fixAt && (!v.trackerLastSeenAt || fixAt > v.trackerLastSeenAt)) {
        updates.trackerLastSeenAt = fixAt;
        if (pos.ignition != null) updates.trackerIgnitionOn = pos.ignition;
      }

      if (pos.valid && Number.isFinite(pos.latitude) && Number.isFinite(pos.longitude)) {
        const distanceKm = haversineKm(cfg.office, pos);
        const atOffice = distanceKm * 1000 <= cfg.officeRadiusM;
        if (atOffice !== v.trackerAtOffice) updates.trackerAtOffice = atOffice;
        if (atOffice && v.trackerAtOffice === false && rental) {
          await open({
            vehicleId: v.id,
            contractId: rental.id,
            type: "ARRIVED_AT_OFFICE",
            dedupeKey: `arrive:${v.id}:${timeBucket(fixAt || now, 30)}`,
            data: { contractNo: rental.contractNo },
            occurredAt: fixAt || now,
          });
        }
        v.trackerAtOffice = atOffice;

        if (cfg.outOfRegionKm && distanceKm > cfg.outOfRegionKm) {
          await open({
            vehicleId: v.id,
            contractId: rental?.id || null,
            type: "OUT_OF_REGION",
            // Once per rental, or once a day for a car not out on rent.
            dedupeKey: `region:${v.id}:${rental ? rental.id : timeBucket(now, 24 * 60)}`,
            data: { distanceKm: Math.round(distanceKm / 10) * 10, contractNo: rental?.contractNo || null },
            occurredAt: fixAt || now,
          });
        }
      }

      const moving = (pos.speedKmh || 0) >= TOW_MIN_SPEED_KMH;
      if (pos.ignition === false && moving && fixAt && now - fixAt <= TOW_FRESH_MS) {
        await open({
          vehicleId: v.id,
          contractId: rental?.id || null,
          type: "TOW",
          dedupeKey: `tow:${v.id}:${timeBucket(fixAt, 60)}`,
          data: { speedKmh: pos.speedKmh },
          occurredAt: fixAt,
        });
      }
    }

    if (Object.keys(updates).length) {
      await prisma.vehicle.update({ where: { id: v.id }, data: updates });
    }

    // Km limit of the rental in progress (same allowance as the return form).
    if (rental && !rental.unlimitedKm && rental.pickUpKm != null && v.currentKm != null) {
      const allowedKm = computeAllowedKm(rental, rental.pickUpTime, rental.dropOffTime);
      const usedKm = v.currentKm - rental.pickUpKm;
      const level = kmLimitLevel({ usedKm, allowedKm, warnPercent: cfg.kmLimitWarnPercent });
      if (level) {
        await open({
          vehicleId: v.id,
          contractId: rental.id,
          type: level === "EXCEEDED" ? "KM_LIMIT_EXCEEDED" : "KM_LIMIT_NEAR",
          dedupeKey: `km${level === "EXCEEDED" ? "over" : "near"}:${rental.id}:${v.id}`,
          data: {
            contractNo: rental.contractNo,
            usedKm,
            allowedKm,
            percent: Math.floor((usedKm / allowedKm) * 100),
          },
          occurredAt: now,
        });
      }
    }

    // No signal for a while (a car in service or passive is expected to be quiet).
    const lastSeen = laterOf(device?.lastUpdate, updates.trackerLastSeenAt, v.trackerLastSeenAt);
    if (device && lastSeen && !v.outOfService && !v.passiveAt && now - lastSeen > cfg.offlineHours * HOUR) {
      await open({
        vehicleId: v.id,
        contractId: rental?.id || null,
        type: "DEVICE_OFFLINE",
        dedupeKey: `offline:${v.id}:${lastSeen.toISOString()}`,
        data: { hours: Math.floor((now - lastSeen) / HOUR), lastSeenAt: lastSeen.toISOString() },
        occurredAt: now,
      });
    }
  }

  // Maintenance, from the latest Periyodik record (same rule as the dashboard).
  const maintenanceCars = vehicles.filter((v) => v.trackMaintenance !== false && v.currentKm != null);
  if (maintenanceCars.length) {
    const rows = await prisma.vehicleMaintenance.findMany({
      where: { vehicleId: { in: maintenanceCars.map((v) => v.id) }, type: "Periodic", nextOdometer: { not: null } },
      select: { vehicleId: true, date: true, nextOdometer: true },
    });
    const latest = new Map();
    for (const r of rows) {
      const cur = latest.get(r.vehicleId);
      if (!cur || new Date(r.date) > new Date(cur.date)) latest.set(r.vehicleId, r);
    }
    for (const v of maintenanceCars) {
      const row = latest.get(v.id);
      if (!row) continue;
      const kmLeft = row.nextOdometer - v.currentKm;
      if (kmLeft > cfg.maintenanceWindowKm) continue;
      const overdue = kmLeft <= 0;
      await open({
        vehicleId: v.id,
        type: overdue ? "MAINTENANCE_OVERDUE" : "MAINTENANCE_DUE",
        dedupeKey: `maint${overdue ? "over" : "due"}:${v.id}:${row.nextOdometer}`,
        data: { kmLeft, nextKm: row.nextOdometer, currentKm: v.currentKm },
        occurredAt: now,
      });
    }
  }

  // Late return: the drop-off time (plus grace) has passed, the contract is
  // still open and the car is known to be away from the office. (Unknown
  // presence — no position yet — is left to the dashboard's overdue list.)
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  for (const c of rentalByCar.values()) {
    const due = wallToInstant(c.dropOffTime).getTime() + cfg.lateReturnGraceMinutes * MINUTE;
    if (now.getTime() <= due) continue;
    const v = vehicleById.get(c.carId);
    if (!v || v.trackerAtOffice !== false) continue;
    await open({
      vehicleId: v.id,
      contractId: c.id,
      type: "LATE_RETURN",
      dedupeKey: `late:${c.id}:${new Date(c.dropOffTime).toISOString()}`,
      data: { contractNo: c.contractNo, dropOffTime: c.dropOffTime },
      occurredAt: now,
    });
  }

  summary.alerts = opened.length;
  const mail = await flushAlertEmails(cfg, now);
  summary.emailed = mail.sent;
  if (mail.error) summary.mailError = mail.error;

  await prisma.setting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", gpsLastTickAt: now },
    update: { gpsLastTickAt: now },
  });
  return summary;
};

module.exports = {
  computeKmSync,
  manualKmCalibration,
  noteManualKm,
  syncKmFromPosition,
  reconcileSpeedLimits,
  runTick,
};
