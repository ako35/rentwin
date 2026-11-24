const HttpError = require("../../lib/http-error");
const { knotsToKmh } = require("../../lib/traccar");

// Rental times (pickUpTime, dropOffTime, returnedAt, changeDate) are Türkiye
// wall-clock stored as UTC (see lib/dates.js). Traccar works in real UTC
// instants, so every comparison between the two goes through these. Türkiye
// has no DST.
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
const wallToInstant = (d) => new Date(new Date(d).getTime() - TR_OFFSET_MS);

// KVKK: a rented vehicle's location is not watched routinely. Opening it needs
// one of these reasons, and every opening is written to TelematicsAccessLog.
const ACCESS_REASONS = ["LATE_RETURN", "THEFT", "BREACH", "ASSISTANCE", "OTHER"];

// After a reason is given, the live location of that vehicle stays visible to
// that admin for this long without asking again.
const LIVE_GRANT_MINUTES = 30;

// Longest route one request may fetch. A 30-second reporting interval is
// ~2,900 points per driving day; seven days keeps the payload reasonable.
const MAX_ROUTE_DAYS = 7;
const MAX_ROUTE_POINTS = 4000;

// Traccar event types worth keeping as rows. Everything else (deviceMoving,
// deviceOnline, ...) only refreshes the vehicle's "last seen".
const STORED_EVENT_TYPES = new Set([
  "ignitionOn",
  "ignitionOff",
  "deviceOverspeed",
  "alarm",
  "geofenceEnter",
  "geofenceExit",
]);

const parseAccessReason = (body = {}, { required = true } = {}) => {
  const reason = typeof body.reason === "string" ? body.reason.trim().toUpperCase() : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!reason) {
    if (required) throw new HttpError(400, "Erişim gerekçesi seçilmelidir.", "REASON_REQUIRED");
    return { reason: null, note: note || null };
  }
  if (!ACCESS_REASONS.includes(reason)) throw new HttpError(400, "Geçersiz erişim gerekçesi.");
  if (reason === "OTHER" && !note) {
    throw new HttpError(400, "\"Diğer\" gerekçesinde açıklama yazılmalıdır.", "NOTE_REQUIRED");
  }
  return { reason, note: note || null };
};

const overlaps = (aFrom, aTo, bFrom, bTo) => aFrom < bTo && bFrom < aTo;

// The real-time window a contract covers: hand-over until hand-back. A
// contract still out ends "now"; a cancelled one covers nothing.
const contractWindow = (contract, now = new Date()) => {
  if (!contract || contract.status === "CANCELLED") return null;
  const from = wallToInstant(contract.pickUpTime);
  if (from >= now) return null;
  let to;
  if (contract.returnedAt) to = wallToInstant(contract.returnedAt);
  else if (contract.status === "DONE") to = wallToInstant(contract.dropOffTime);
  else to = now;
  if (to > now) to = now;
  return to > from ? { from, to } : null;
};

// Which car the customer had when: a mid-rental vehicle swap
// (ContractVehicleChange) splits the contract into per-car segments.
const contractSegments = (contract, changes = [], now = new Date()) => {
  const window = contractWindow(contract, now);
  if (!window) return [];
  const sorted = [...changes].sort((a, b) => new Date(a.changeDate) - new Date(b.changeDate));

  const segments = [];
  let carId = sorted.length ? sorted[0].previousCarId : contract.carId;
  let from = window.from;
  for (const change of sorted) {
    const at = wallToInstant(change.changeDate);
    segments.push({ carId, from, to: at });
    carId = change.newCarId;
    from = at;
  }
  segments.push({ carId, from, to: window.to });

  return segments
    .map((s) => ({
      ...s,
      from: s.from < window.from ? window.from : s.from,
      to: s.to > window.to ? window.to : s.to,
    }))
    .filter((s) => s.to > s.from);
};

// Spans in which `vehicleId` was out with a customer, across the given
// contracts (each loaded with its vehicleChanges).
const rentalSpansForVehicle = (contracts, vehicleId, now = new Date()) =>
  contracts.flatMap((c) =>
    contractSegments(c, c.vehicleChanges || [], now)
      .filter((s) => s.carId === vehicleId)
      .map((s) => ({ ...s, contractId: c.id, contractNo: c.contractNo || null }))
  );

const parseRange = (body = {}) => {
  const from = new Date(body.from);
  const to = new Date(body.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    throw new HttpError(400, "Geçersiz tarih aralığı.");
  }
  if (to - from > MAX_ROUTE_DAYS * 24 * 60 * 60 * 1000) {
    throw new HttpError(400, `Rota en fazla ${MAX_ROUTE_DAYS} günlük aralık için açılabilir.`, "RANGE_TOO_LONG");
  }
  return { from, to };
};

const haversineKm = (a, b) => {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Traccar positions -> compact route for the map: [lat, lng, isoTime, km/h]
// points (thinned to MAX_ROUTE_POINTS, always keeping the last one) plus a
// small summary computed on the full set.
const summarizeRoute = (positions) => {
  const valid = (positions || [])
    .filter((p) => p.valid !== false && Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .sort((a, b) => new Date(a.fixTime) - new Date(b.fixTime));

  let distanceKm = 0;
  let maxSpeedKmh = 0;
  for (let i = 0; i < valid.length; i++) {
    const speed = knotsToKmh(valid[i].speed) || 0;
    if (speed > maxSpeedKmh) maxSpeedKmh = speed;
    if (i > 0) distanceKm += haversineKm(valid[i - 1], valid[i]);
  }

  const step = Math.max(1, Math.ceil(valid.length / MAX_ROUTE_POINTS));
  const points = [];
  for (let i = 0; i < valid.length; i += step) points.push(valid[i]);
  if (valid.length && points[points.length - 1] !== valid[valid.length - 1]) points.push(valid[valid.length - 1]);

  return {
    points: points.map((p) => [
      Math.round(p.latitude * 1e5) / 1e5,
      Math.round(p.longitude * 1e5) / 1e5,
      p.fixTime,
      knotsToKmh(p.speed) || 0,
    ]),
    summary: {
      pointCount: valid.length,
      distanceKm: Math.round(distanceKm * 10) / 10,
      maxSpeedKmh,
      firstFix: valid[0]?.fixTime || null,
      lastFix: valid[valid.length - 1]?.fixTime || null,
    },
  };
};

// Traccar event-forwarding payload -> TelematicsEvent row data (no
// coordinates), or null when the event type isn't one we keep.
const mapForwardedEvent = ({ event, geofence } = {}) => {
  if (!event || !STORED_EVENT_TYPES.has(event.type)) return null;
  const attrs = event.attributes || {};
  const occurredAt = new Date(event.eventTime || event.serverTime || Date.now());
  return {
    traccarEventId: Number.isInteger(event.id) ? event.id : null,
    type: event.type,
    alarm: event.type === "alarm" && typeof attrs.alarm === "string" ? attrs.alarm.slice(0, 64) : null,
    geofenceName: geofence?.name ? String(geofence.name).slice(0, 120) : null,
    speedKmh: event.type === "deviceOverspeed" ? knotsToKmh(attrs.speed) : null,
    occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
  };
};

module.exports = {
  TR_OFFSET_MS,
  wallToInstant,
  ACCESS_REASONS,
  LIVE_GRANT_MINUTES,
  MAX_ROUTE_DAYS,
  MAX_ROUTE_POINTS,
  STORED_EVENT_TYPES,
  parseAccessReason,
  overlaps,
  contractWindow,
  contractSegments,
  rentalSpansForVehicle,
  parseRange,
  summarizeRoute,
  mapForwardedEvent,
};
