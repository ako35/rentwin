const test = require("node:test");
const assert = require("node:assert/strict");
const {
  wallToInstant,
  parseAccessReason,
  contractWindow,
  contractSegments,
  rentalSpansForVehicle,
  parseRange,
  summarizeRoute,
  mapForwardedEvent,
  MAX_ROUTE_POINTS,
} = require("./telematics.shared");

// Rental times are Türkiye wall-clock stored as UTC: "10:00" is 10:00Z in the
// database and 07:00Z as a real instant.
const wall = (s) => new Date(`${s}Z`);
const NOW = new Date("2026-11-24T12:00:00Z");

test("wall-clock rental times shift three hours back to real instants", () => {
  assert.equal(wallToInstant(wall("2026-11-20T10:00:00")).toISOString(), "2026-11-20T07:00:00.000Z");
});

test("an open contract runs until now, a returned one until hand-back", () => {
  const open = { status: "CREATED", carId: "a", pickUpTime: wall("2026-11-20T10:00:00"), dropOffTime: wall("2026-11-30T10:00:00") };
  assert.deepEqual(contractWindow(open, NOW), { from: new Date("2026-11-20T07:00:00Z"), to: NOW });

  const done = { ...open, status: "DONE", returnedAt: wall("2026-11-22T18:30:00") };
  assert.equal(contractWindow(done, NOW).to.toISOString(), "2026-11-22T15:30:00.000Z");

  const doneNoReturn = { ...open, status: "DONE", dropOffTime: wall("2026-11-21T10:00:00") };
  assert.equal(contractWindow(doneNoReturn, NOW).to.toISOString(), "2026-11-21T07:00:00.000Z");
});

test("cancelled and not-yet-started contracts cover nothing", () => {
  assert.equal(contractWindow({ status: "CANCELLED", pickUpTime: wall("2026-11-20T10:00:00") }, NOW), null);
  assert.equal(
    contractWindow({ status: "CREATED", pickUpTime: wall("2026-11-25T10:00:00"), dropOffTime: wall("2026-11-26T10:00:00") }, NOW),
    null
  );
});

test("a mid-rental vehicle swap splits the contract per car", () => {
  const contract = {
    id: "c1",
    status: "DONE",
    carId: "new",
    pickUpTime: wall("2026-11-20T10:00:00"),
    dropOffTime: wall("2026-11-23T10:00:00"),
    returnedAt: wall("2026-11-23T09:00:00"),
  };
  const changes = [{ changeDate: wall("2026-11-21T12:00:00"), previousCarId: "old", newCarId: "new" }];
  const segments = contractSegments(contract, changes, NOW);
  assert.deepEqual(
    segments.map((s) => [s.carId, s.from.toISOString(), s.to.toISOString()]),
    [
      ["old", "2026-11-20T07:00:00.000Z", "2026-11-21T09:00:00.000Z"],
      ["new", "2026-11-21T09:00:00.000Z", "2026-11-23T06:00:00.000Z"],
    ]
  );

  const spans = rentalSpansForVehicle([{ ...contract, contractNo: "K-1", vehicleChanges: changes }], "old", NOW);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].contractId, "c1");
  assert.equal(spans[0].to.toISOString(), "2026-11-21T09:00:00.000Z");
});

test("access reason: required, validated, and 'OTHER' needs a note", () => {
  assert.throws(() => parseAccessReason({}), /gerekçesi/);
  assert.deepEqual(parseAccessReason({}, { required: false }), { reason: null, note: null });
  assert.deepEqual(parseAccessReason({ reason: "theft" }), { reason: "THEFT", note: null });
  assert.throws(() => parseAccessReason({ reason: "CURIOUS" }), /Geçersiz/);
  assert.throws(() => parseAccessReason({ reason: "OTHER" }), /açıklama/);
  assert.deepEqual(parseAccessReason({ reason: "OTHER", note: " müşteri aradı " }), { reason: "OTHER", note: "müşteri aradı" });
});

test("route range must be valid and at most seven days", () => {
  assert.throws(() => parseRange({ from: "x", to: "y" }), /Geçersiz/);
  assert.throws(() => parseRange({ from: "2026-11-01T00:00:00Z", to: "2026-11-09T00:00:00Z" }), /7/);
  const { from, to } = parseRange({ from: "2026-11-01T00:00:00Z", to: "2026-11-02T00:00:00Z" });
  assert.equal(to - from, 24 * 60 * 60 * 1000);
});

test("route summary: distance, top speed, invalid fixes dropped, thinned but keeps the last point", () => {
  const base = Date.parse("2026-11-24T08:00:00Z");
  const positions = [];
  for (let i = 0; i < MAX_ROUTE_POINTS * 2 + 1; i++) {
    positions.push({
      latitude: 38.8 + i * 0.0001,
      longitude: 26.97,
      speed: i === 5 ? 54 : 27, // knots: 100 / 50 km/h
      fixTime: new Date(base + i * 30000).toISOString(),
      valid: true,
    });
  }
  positions.push({ latitude: 0, longitude: 0, speed: 0, fixTime: new Date(base).toISOString(), valid: false });

  const { points, summary } = summarizeRoute(positions);
  assert.equal(summary.pointCount, MAX_ROUTE_POINTS * 2 + 1);
  assert.equal(summary.maxSpeedKmh, 100);
  assert.ok(summary.distanceKm > 88 && summary.distanceKm < 90, `distance ${summary.distanceKm}`);
  assert.ok(points.length <= MAX_ROUTE_POINTS + 1);
  assert.equal(points[points.length - 1][2], positions[MAX_ROUTE_POINTS * 2].fixTime);
});

test("forwarded events: kept types map without coordinates, others are skipped", () => {
  const ign = mapForwardedEvent({ event: { id: 7, type: "ignitionOn", eventTime: "2026-11-24T08:00:00Z" } });
  assert.deepEqual(ign, {
    traccarEventId: 7,
    type: "ignitionOn",
    alarm: null,
    geofenceName: null,
    speedKmh: null,
    occurredAt: new Date("2026-11-24T08:00:00Z"),
  });

  const alarm = mapForwardedEvent({ event: { id: 8, type: "alarm", attributes: { alarm: "powerCut" } } });
  assert.equal(alarm.alarm, "powerCut");

  const over = mapForwardedEvent({ event: { id: 9, type: "deviceOverspeed", attributes: { speed: 81 } } });
  assert.equal(over.speedKmh, 150);

  const fence = mapForwardedEvent({ event: { type: "geofenceEnter" }, geofence: { name: "Aliağa ofis" } });
  assert.equal(fence.geofenceName, "Aliağa ofis");
  assert.equal(fence.traccarEventId, null);

  assert.equal(mapForwardedEvent({ event: { type: "deviceMoving" } }), null);
  assert.equal("latitude" in ign, false);
});
