const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULTS,
  SEVERITY_BY_TYPE,
  gpsSettings,
  alarmAlertType,
  timeBucket,
  kmLimitLevel,
  alertText,
  buildAlertEmail,
} = require("./telematics.alerts");
const { computeKmSync, manualKmCalibration } = require("./telematics.sync");

test("gpsSettings falls back to the defaults for blank fields", () => {
  const cfg = gpsSettings({});
  assert.equal(cfg.overspeedKmh, DEFAULTS.overspeedKmh);
  assert.equal(cfg.kmLimitWarnPercent, 80);
  assert.equal(cfg.outOfRegionKm, null);
  assert.deepEqual(cfg.alertEmails, []);
  assert.equal(cfg.office.latitude, DEFAULTS.officeLat);

  const custom = gpsSettings({
    gpsOverspeedKmh: 120,
    gpsAlertEmails: "A@x.com, b@y.com; a@x.com bad",
    gpsOfficeLat: 38.8,
    gpsOfficeLng: 26.97,
    alertWindowMaintenanceKm: 500,
  });
  assert.equal(custom.overspeedKmh, 120);
  assert.deepEqual(custom.alertEmails, ["a@x.com", "b@y.com"]);
  assert.deepEqual(custom.office, { latitude: 38.8, longitude: 26.97 });
  assert.equal(custom.maintenanceWindowKm, 500);
});

test("alarm names map to alert types; unknown alarms open nothing", () => {
  assert.equal(alarmAlertType("powerCut"), "DEVICE_TAMPER");
  assert.equal(alarmAlertType("tow"), "TOW");
  assert.equal(alarmAlertType("lowBattery"), "LOW_BATTERY");
  assert.equal(alarmAlertType("sos"), null);
  assert.equal(SEVERITY_BY_TYPE.DEVICE_TAMPER, "CRITICAL");
  assert.equal(SEVERITY_BY_TYPE.ARRIVED_AT_OFFICE, "INFO");
});

test("timeBucket floors to the window start", () => {
  assert.equal(timeBucket("2026-11-24T10:44:59Z", 30), "2026-11-24T10:30:00.000Z");
  assert.equal(timeBucket("2026-11-24T10:30:00Z", 30), "2026-11-24T10:30:00.000Z");
  assert.equal(timeBucket("2026-11-24T23:59:00Z", 24 * 60), "2026-11-24T00:00:00.000Z");
});

test("kmLimitLevel: near at the warning percent, exceeded past the allowance", () => {
  assert.equal(kmLimitLevel({ usedKm: 790, allowedKm: 1000, warnPercent: 80 }), null);
  assert.equal(kmLimitLevel({ usedKm: 800, allowedKm: 1000, warnPercent: 80 }), "NEAR");
  assert.equal(kmLimitLevel({ usedKm: 1000, allowedKm: 1000, warnPercent: 80 }), "NEAR");
  assert.equal(kmLimitLevel({ usedKm: 1001, allowedKm: 1000, warnPercent: 80 }), "EXCEEDED");
  assert.equal(kmLimitLevel({ usedKm: 5000, allowedKm: null, warnPercent: 80 }), null); // unlimited
});

test("computeKmSync: first reading calibrates from the vehicle's km", () => {
  const now = new Date("2026-11-24T10:00:00Z");
  const r = computeKmSync({ currentKm: 50000, trackerKmOffset: null, trackerKmAnchorKm: null }, 120, now, now);
  assert.equal(r.data.trackerKmOffset, 49880);
  assert.equal(r.estimatedKm, 50000);
  assert.equal(r.data.currentKm, undefined); // not higher: nothing to write
  assert.equal(r.data.trackerOdometerKm, 120);
});

test("computeKmSync: later readings move currentKm up, never down", () => {
  const v = { currentKm: 50000, trackerKmOffset: 49880, trackerKmAnchorKm: null };
  assert.equal(computeKmSync(v, 245).data.currentKm, 50125);
  assert.equal(computeKmSync({ ...v, currentKm: 50300 }, 245).data.currentKm, undefined);
});

test("computeKmSync: a waiting dashboard km (anchor) sets the offset on the next reading", () => {
  const r = computeKmSync({ currentKm: 50500, trackerKmOffset: 49880, trackerKmAnchorKm: 50500 }, 600);
  assert.equal(r.data.trackerKmOffset, 49900);
  assert.equal(r.data.trackerKmAnchorKm, null);
  assert.equal(r.estimatedKm, 50500);
});

test("manualKmCalibration uses a fresh or parked reading, else waits", () => {
  const now = new Date("2026-11-24T10:00:00Z");
  const fresh = { trackerOdometerKm: 600, trackerOdometerAt: new Date("2026-11-24T09:55:00Z"), trackerIgnitionOn: true };
  assert.deepEqual(manualKmCalibration(fresh, 50510, now), {
    trackerKmOffset: 49910,
    trackerKmAnchorKm: null,
    trackerKmCalibratedAt: now,
  });

  const parked = { trackerOdometerKm: 600, trackerOdometerAt: new Date("2026-11-23T18:00:00Z"), trackerIgnitionOn: false };
  assert.equal(manualKmCalibration(parked, 50510, now).trackerKmOffset, 49910);

  const stale = { trackerOdometerKm: 600, trackerOdometerAt: new Date("2026-11-24T08:00:00Z"), trackerIgnitionOn: true };
  assert.deepEqual(manualKmCalibration(stale, 50510, now), { trackerKmAnchorKm: 50510 });

  assert.deepEqual(manualKmCalibration({ trackerOdometerKm: null }, 50510, now), { trackerKmAnchorKm: 50510 });
});

test("alert texts and e-mail carry no coordinates", () => {
  const alerts = [
    {
      type: "LATE_RETURN",
      severity: "WARNING",
      data: { contractNo: "K-12", dropOffTime: "2026-11-24T10:00:00.000Z" },
      occurredAt: new Date("2026-11-24T08:30:00Z"),
      vehicle: { licensePlate: "35 ABC 123" },
    },
    {
      type: "DEVICE_TAMPER",
      severity: "CRITICAL",
      data: { alarm: "powerCut" },
      occurredAt: new Date("2026-11-24T08:00:00Z"),
      vehicle: { licensePlate: "35 XYZ 9" },
    },
  ];
  // Wall-clock drop-off is shown as typed (10:00), not shifted.
  assert.match(alertText(alerts[0]), /K-12.*10:00.*ofiste değil/);
  const mail = buildAlertEmail(alerts);
  assert.match(mail.subject, /2 yeni uyarı/);
  assert.match(mail.text, /\[ACİL\].*35 XYZ 9/);
  assert.match(mail.html, /admin\/vehicles\/gps-alerts/);
  assert.doesNotMatch(mail.text + mail.html, /latitude|longitude|38\.\d{3}/);
});

// ---- Faz 4

const { normalizePosition, percentToEighths } = require("../../lib/traccar");

test("accident alarm is a critical alert; harsh driving alarms open none", () => {
  assert.equal(alarmAlertType("accident"), "ACCIDENT");
  assert.equal(SEVERITY_BY_TYPE.ACCIDENT, "CRITICAL");
  assert.equal(alarmAlertType("hardBraking"), null);
  assert.equal(alarmAlertType("hardCornering"), null);
});

test("fuel: CAN fuelLevel % first, EV energyLevel % next, litres and tracker battery ignored", () => {
  assert.deepEqual(normalizePosition({ attributes: { fuelLevel: 62 } }).fuel, { percent: 62, source: "fuel" });
  assert.deepEqual(normalizePosition({ attributes: { energyLevel: 80 } }).fuel, { percent: 80, source: "battery" });
  assert.equal(normalizePosition({ attributes: { fuel: 31.5, batteryLevel: 90 } }).fuel, null);
  assert.equal(normalizePosition({ attributes: { fuelLevel: 140 } }).fuel, null); // not a percentage
});

test("percentToEighths rounds to the nearest eighth within 0-8", () => {
  assert.equal(percentToEighths(0), 0);
  assert.equal(percentToEighths(40), 3);
  assert.equal(percentToEighths(62), 5);
  assert.equal(percentToEighths(100), 8);
});

test("computeKmSync: a device counter that went backwards recalibrates from the vehicle's km", () => {
  const v = { currentKm: 50300, trackerOdometerKm: 2700, trackerKmOffset: 47600, trackerKmAnchorKm: null };
  const r = computeKmSync(v, 15); // device replaced / reset
  assert.equal(r.data.trackerKmOffset, 50285);
  assert.equal(r.estimatedKm, 50300);
  assert.equal(r.data.currentKm, undefined);
  // small jitter is not a reset
  assert.equal(computeKmSync(v, 2699.5).data.trackerKmOffset, undefined);
});
