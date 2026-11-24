const crypto = require("crypto");
const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const traccar = require("../../lib/traccar");
const asyncHandler = require("../../middleware/async-handler");
const {
  getRentedVehicleIds,
  getVehicleStatus,
  getActiveRentalContractId,
} = require("../vehicles/vehicles.shared");
const {
  TR_OFFSET_MS,
  LIVE_GRANT_MINUTES,
  MAX_ROUTE_DAYS,
  parseAccessReason,
  overlaps,
  contractSegments,
  rentalSpansForVehicle,
  parseRange,
  summarizeRoute,
  mapForwardedEvent,
} = require("./telematics.shared");

// GPS takip (docs/gps-takip-yol-haritasi.md, Faz 2).
//
// Privacy rules enforced here, not just in the UI:
// - Coordinates are never written to our database; they are read from Traccar
//   per request and passed through.
// - A rented vehicle's live location, speed and ignition stay hidden until an
//   admin gives a reason (LIVE grant, LIVE_GRANT_MINUTES long).
// - A route that overlaps a rental needs a reason; a contract route always
//   does. Every location access to a rented period is logged.

const TRACKER_ID_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const actorName = (user) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || user.id;

const logAccess = (req, data) =>
  prisma.telematicsAccessLog.create({
    data: { actorId: req.user.id, actorName: actorName(req.user), ...data },
  });

// vehicleId -> until (Date) for this admin's still-valid LIVE grants.
const activeGrants = async (actorId, vehicleIds) => {
  if (!vehicleIds.length) return new Map();
  const since = new Date(Date.now() - LIVE_GRANT_MINUTES * 60 * 1000);
  const logs = await prisma.telematicsAccessLog.findMany({
    where: { actorId, vehicleId: { in: vehicleIds }, scope: "LIVE", createdAt: { gte: since } },
    select: { vehicleId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const grants = new Map();
  for (const log of logs) {
    if (!grants.has(log.vehicleId)) {
      grants.set(log.vehicleId, new Date(log.createdAt.getTime() + LIVE_GRANT_MINUTES * 60 * 1000));
    }
  }
  return grants;
};

const laterOf = (...dates) =>
  dates.filter(Boolean).map((d) => new Date(d)).sort((a, b) => b - a)[0] || null;

const VEHICLE_SELECT = {
  id: true,
  licensePlate: true,
  brand: true,
  model: true,
  soldAt: true,
  outOfService: true,
  passiveAt: true,
  currentKm: true,
  trackerImei: true,
  trackerLastSeenAt: true,
  trackerIgnitionOn: true,
};

const findVehicle = async (id) => {
  const vehicle = await prisma.vehicle.findUnique({ where: { id }, select: VEHICLE_SELECT });
  if (!vehicle) throw new HttpError(404, "Araç bulunamadı.");
  return vehicle;
};

const livePosition = (pos) =>
  pos
    ? {
        latitude: pos.latitude,
        longitude: pos.longitude,
        course: pos.course,
        speedKmh: pos.speedKmh,
        fixTime: pos.fixTime,
        ignition: pos.ignition,
        motion: pos.motion,
      }
    : null;

// ---------------------------------------------------------------- fleet map

const getFleet = asyncHandler(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { soldAt: null },
    select: { ...VEHICLE_SELECT, branch: { select: { code: true } } },
    orderBy: { licensePlate: "asc" },
  });
  const tracked = vehicles.filter((v) => v.trackerImei);
  const ids = tracked.map((v) => v.id);
  const [rentedIds, grants] = await Promise.all([getRentedVehicleIds(ids), activeGrants(req.user.id, ids)]);

  const configured = traccar.isConfigured();
  let traccarError = configured ? null : "TRACCAR_NOT_CONFIGURED";
  const deviceByUid = new Map();
  const positionByDevice = new Map();
  if (configured && tracked.length) {
    try {
      const [devices, positions] = await Promise.all([traccar.listDevices(), traccar.latestPositions()]);
      for (const d of devices || []) deviceByUid.set(d.uniqueId, d);
      for (const p of positions || []) positionByDevice.set(p.deviceId, p);
    } catch (err) {
      traccarError = err.code || "TRACCAR_ERROR";
    }
  }

  const rows = tracked.map((v) => {
    const status = getVehicleStatus(v, rentedIds);
    const device = deviceByUid.get(v.trackerImei) || null;
    const pos = traccar.normalizePosition(device ? positionByDevice.get(device.id) : null);
    const grantUntil = grants.get(v.id) || null;
    const hidden = status === "RENTED" && !grantUntil;
    return {
      id: v.id,
      licensePlate: v.licensePlate,
      brand: v.brand,
      model: v.model,
      branchCode: v.branch?.code || null,
      status,
      deviceRegistered: !!device,
      deviceStatus: device?.status || null,
      lastSeenAt: laterOf(device?.lastUpdate, v.trackerLastSeenAt),
      locationHidden: hidden,
      grantUntil,
      position: hidden ? null : livePosition(pos),
    };
  });

  res.json({
    configured,
    traccarError,
    grantMinutes: LIVE_GRANT_MINUTES,
    vehicles: rows,
    untrackedCount: vehicles.length - tracked.length,
  });
});

// ------------------------------------------------------ one vehicle (Konum)

const getVehicleTelematics = asyncHandler(async (req, res) => {
  const v = await findVehicle(req.params.id);
  const [rentedIds, grants, events, activeContractId] = await Promise.all([
    getRentedVehicleIds([v.id]),
    activeGrants(req.user.id, [v.id]),
    prisma.telematicsEvent.findMany({
      where: { vehicleId: v.id },
      orderBy: { occurredAt: "desc" },
      take: 50,
      select: { id: true, type: true, alarm: true, geofenceName: true, speedKmh: true, occurredAt: true },
    }),
    getActiveRentalContractId(v.id),
  ]);
  const status = getVehicleStatus(v, rentedIds);
  const grantUntil = grants.get(v.id) || null;
  const hidden = status === "RENTED" && !grantUntil;

  const configured = traccar.isConfigured();
  let traccarError = configured ? null : "TRACCAR_NOT_CONFIGURED";
  let device = null;
  let pos = null;
  if (v.trackerImei && configured) {
    try {
      device = await traccar.findDeviceByUniqueId(v.trackerImei);
      if (device?.positionId) pos = traccar.normalizePosition(await traccar.getPosition(device.positionId));
    } catch (err) {
      traccarError = err.code || "TRACCAR_ERROR";
    }
  }

  res.json({
    configured,
    traccarError,
    grantMinutes: LIVE_GRANT_MINUTES,
    maxRouteDays: MAX_ROUTE_DAYS,
    trackerImei: v.trackerImei,
    deviceRegistered: !!device,
    deviceStatus: device?.status || null,
    lastSeenAt: laterOf(device?.lastUpdate, v.trackerLastSeenAt),
    status,
    activeContractId,
    locationHidden: hidden,
    grantUntil,
    position: hidden ? null : livePosition(pos),
    // Odometer is not location data — the km limit and maintenance flows need
    // it whether or not the car is out.
    deviceOdometerKm: pos?.odometerKm ?? null,
    currentKm: v.currentKm,
    events,
  });
});

const setTracker = asyncHandler(async (req, res) => {
  const raw = typeof req.body?.imei === "string" ? req.body.imei.trim() : "";
  if (raw && !TRACKER_ID_PATTERN.test(raw)) {
    throw new HttpError(400, "Cihaz kimliği 4-32 karakter olmalı (rakam, harf, - veya _).", "INVALID_TRACKER_ID");
  }
  const v = await findVehicle(req.params.id);

  if (raw) {
    const other = await prisma.vehicle.findUnique({
      where: { trackerImei: raw },
      select: { id: true, licensePlate: true },
    });
    if (other && other.id !== v.id) {
      throw new HttpError(409, `Bu cihaz ${other.licensePlate} plakalı araca tanımlı.`, "TRACKER_TAKEN");
    }
  }

  const changed = (raw || null) !== v.trackerImei;
  await prisma.vehicle.update({
    where: { id: v.id },
    data: {
      trackerImei: raw || null,
      ...(changed ? { trackerLastSeenAt: null, trackerIgnitionOn: null } : {}),
    },
  });

  // Register the device in Traccar (named after the plate) so the operator
  // never has to open Traccar's own panel. Best effort: the IMEI is saved
  // either way and a later save retries.
  let deviceRegistered = false;
  let traccarError = null;
  if (raw && traccar.isConfigured()) {
    try {
      const device = await traccar.findDeviceByUniqueId(raw);
      if (!device) await traccar.createDevice({ name: v.licensePlate, uniqueId: raw });
      else if (device.name !== v.licensePlate) await traccar.updateDevice({ ...device, name: v.licensePlate });
      deviceRegistered = true;
    } catch (err) {
      traccarError = err.code || "TRACCAR_ERROR";
    }
  } else if (raw) {
    traccarError = "TRACCAR_NOT_CONFIGURED";
  }

  res.json({ trackerImei: raw || null, deviceRegistered, traccarError });
});

const grantLiveAccess = asyncHandler(async (req, res) => {
  const { reason, note } = parseAccessReason(req.body);
  const v = await findVehicle(req.params.id);
  const contractId = await getActiveRentalContractId(v.id);
  await logAccess(req, { vehicleId: v.id, contractId, scope: "LIVE", reason, note });
  res.status(201).json({ grantUntil: new Date(Date.now() + LIVE_GRANT_MINUTES * 60 * 1000) });
});

// Contracts in which `vehicleId` was (or is) the car, for the rental check.
const contractsTouchingVehicle = (vehicleId, to) =>
  prisma.contract.findMany({
    where: {
      status: { not: "CANCELLED" },
      // pickUpTime is wall-clock stored as UTC: instant + 3h.
      pickUpTime: { lte: new Date(to.getTime() + TR_OFFSET_MS) },
      OR: [
        { carId: vehicleId },
        { vehicleChanges: { some: { OR: [{ previousCarId: vehicleId }, { newCarId: vehicleId }] } } },
      ],
    },
    select: {
      id: true,
      contractNo: true,
      carId: true,
      status: true,
      pickUpTime: true,
      dropOffTime: true,
      returnedAt: true,
      vehicleChanges: { select: { changeDate: true, previousCarId: true, newCarId: true } },
    },
  });

const requireDevice = async (trackerImei) => {
  if (!trackerImei) throw new HttpError(409, "Bu araca takip cihazı tanımlı değil.", "NO_TRACKER");
  const device = await traccar.findDeviceByUniqueId(trackerImei);
  if (!device) throw new HttpError(409, "Cihaz GPS sunucusunda kayıtlı değil.", "DEVICE_NOT_REGISTERED");
  return device;
};

const getVehicleRoute = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.body);
  const v = await findVehicle(req.params.id);
  if (!v.trackerImei) throw new HttpError(409, "Bu araca takip cihazı tanımlı değil.", "NO_TRACKER");

  const contracts = await contractsTouchingVehicle(v.id, to);
  const rentals = rentalSpansForVehicle(contracts, v.id).filter((s) => overlaps(s.from, s.to, from, to));
  if (rentals.length && !req.body?.reason) {
    // Not an error the UI shows: it asks for a reason and sends again.
    return res.status(409).json({
      message: "Seçilen aralık bir kiralamaya denk geliyor; erişim gerekçesi gerekli.",
      code: "REASON_REQUIRED",
      rentals,
    });
  }
  const { reason, note } = parseAccessReason(req.body, { required: rentals.length > 0 });

  const device = await requireDevice(v.trackerImei);
  const positions = await traccar.positionsBetween(device.id, from, to);
  await logAccess(req, {
    vehicleId: v.id,
    contractId: rentals[0]?.contractId || null,
    scope: "ROUTE",
    reason,
    note,
    rangeFrom: from,
    rangeTo: to,
  });

  res.json({ from, to, rentals, ...summarizeRoute(positions) });
});

// ------------------------------------------------------- contract route

const clip = (s, from, to) => ({ ...s, from: s.from < from ? from : s.from, to: s.to > to ? to : s.to });

const getContractRoute = asyncHandler(async (req, res) => {
  const { reason, note } = parseAccessReason(req.body);
  const contract = await prisma.contract.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      contractNo: true,
      carId: true,
      status: true,
      pickUpTime: true,
      dropOffTime: true,
      returnedAt: true,
      vehicleChanges: { select: { changeDate: true, previousCarId: true, newCarId: true } },
    },
  });
  if (!contract) throw new HttpError(404, "Kontrat bulunamadı.");

  const segments = contractSegments(contract, contract.vehicleChanges);
  if (!segments.length) {
    throw new HttpError(409, "Bu kontratın henüz başlamış bir kiralama dönemi yok.", "NO_RENTAL_WINDOW");
  }
  const window = { from: segments[0].from, to: segments[segments.length - 1].to };

  // Optional sub-range inside the rental; a long rental defaults to its last
  // MAX_ROUTE_DAYS days.
  let from = req.body?.from ? new Date(req.body.from) : null;
  let to = req.body?.to ? new Date(req.body.to) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    throw new HttpError(400, "Geçersiz tarih aralığı.");
  }
  to = to && to < window.to ? to : window.to;
  if (!from) from = new Date(Math.max(window.from.getTime(), to.getTime() - MAX_ROUTE_DAYS * DAY_MS));
  if (from < window.from) from = window.from;
  if (to <= from) throw new HttpError(400, "Geçersiz tarih aralığı.");
  if (to - from > MAX_ROUTE_DAYS * DAY_MS) {
    throw new HttpError(400, `Rota en fazla ${MAX_ROUTE_DAYS} günlük aralık için açılabilir.`, "RANGE_TOO_LONG");
  }

  const parts = segments.filter((s) => overlaps(s.from, s.to, from, to)).map((s) => clip(s, from, to));
  const cars = await prisma.vehicle.findMany({
    where: { id: { in: [...new Set(parts.map((p) => p.carId))] } },
    select: { id: true, licensePlate: true, trackerImei: true },
  });
  const carById = new Map(cars.map((c) => [c.id, c]));

  const tracked = parts.some((p) => carById.get(p.carId)?.trackerImei);
  const devices = tracked ? await traccar.listDevices() : [];
  const deviceByUid = new Map((devices || []).map((d) => [d.uniqueId, d]));

  const result = [];
  for (const part of parts) {
    const car = carById.get(part.carId);
    const device = car?.trackerImei ? deviceByUid.get(car.trackerImei) : null;
    const base = { carId: part.carId, licensePlate: car?.licensePlate || null, from: part.from, to: part.to };
    if (!car?.trackerImei) {
      result.push({ ...base, noTracker: true, points: [], summary: null });
      continue;
    }
    if (!device) {
      result.push({ ...base, deviceMissing: true, points: [], summary: null });
      continue;
    }
    const positions = await traccar.positionsBetween(device.id, part.from, part.to);
    await logAccess(req, {
      vehicleId: part.carId,
      contractId: contract.id,
      scope: "CONTRACT_ROUTE",
      reason,
      note,
      rangeFrom: part.from,
      rangeTo: part.to,
    });
    result.push({ ...base, ...summarizeRoute(positions) });
  }

  res.json({ window, from, to, maxRouteDays: MAX_ROUTE_DAYS, segments: result });
});

// ------------------------------------------------------------- access log

const listAccessLogs = asyncHandler(async (req, res) => {
  const { vehicleId, contractId } = req.query;
  const logs = await prisma.telematicsAccessLog.findMany({
    where: {
      ...(typeof vehicleId === "string" && vehicleId ? { vehicleId } : {}),
      ...(typeof contractId === "string" && contractId ? { contractId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { vehicle: { select: { licensePlate: true } } },
  });
  res.json(
    logs.map(({ vehicle, actorId, ...log }) => ({ ...log, licensePlate: vehicle?.licensePlate || null }))
  );
});

// ---------------------------------------------------------------- webhook

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest();

// Traccar event forwarding (traccar.xml):
//   event.forward.enable = true
//   event.forward.url    = https://rentwin.com.tr/api/telematics/webhook
//   event.forward.header = Authorization: Bearer <TELEMATICS_WEBHOOK_SECRET>
// Only events arrive here (ignition, overspeed, alarms, geofences), never the
// position stream, and nothing location-bearing is stored.
const handleWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.TELEMATICS_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ message: "Webhook not configured." });
  const header = req.headers.authorization || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!given || !crypto.timingSafeEqual(sha256(given), sha256(secret))) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  const { event, device, geofence } = req.body || {};
  const uniqueId = device?.uniqueId != null ? String(device.uniqueId) : "";
  if (!event?.type || !uniqueId) return res.status(400).json({ message: "Invalid event." });

  const vehicle = await prisma.vehicle.findUnique({
    where: { trackerImei: uniqueId },
    select: { id: true, trackerLastSeenAt: true },
  });
  if (!vehicle) return res.json({ stored: false, reason: "unknown-device" });

  const row = mapForwardedEvent({ event, geofence });
  const seenAt = row?.occurredAt || new Date(event.eventTime || Date.now());
  const isNewest = !vehicle.trackerLastSeenAt || seenAt >= vehicle.trackerLastSeenAt;

  if (row) {
    const data = { ...row, vehicleId: vehicle.id };
    if (row.traccarEventId != null) {
      await prisma.telematicsEvent.upsert({
        where: { traccarEventId: row.traccarEventId },
        create: data,
        update: {},
      });
    } else {
      await prisma.telematicsEvent.create({ data });
    }
  }

  if (isNewest && !Number.isNaN(seenAt.getTime())) {
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        trackerLastSeenAt: seenAt,
        ...(row?.type === "ignitionOn" ? { trackerIgnitionOn: true } : {}),
        ...(row?.type === "ignitionOff" ? { trackerIgnitionOn: false } : {}),
      },
    });
  }

  res.json({ stored: !!row });
});

module.exports = {
  getFleet,
  getVehicleTelematics,
  setTracker,
  grantLiveAccess,
  getVehicleRoute,
  getContractRoute,
  listAccessLogs,
  handleWebhook,
};
