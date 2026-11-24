const HttpError = require("./http-error");

// Minimal Traccar REST client (https://www.traccar.org/api-reference/).
//
// Traccar runs on our own VPS in Türkiye (docs/gps-takip-yol-haritasi.md) and
// keeps the full position history. Rentwin never stores coordinates in its own
// database: every map and route is fetched from here on demand.
//
// Env:
//   TRACCAR_URL    e.g. https://gps.rentwin.com.tr (no trailing /api)
//   TRACCAR_TOKEN  API token of a Traccar service user (Settings → Preferences
//                  → Token), sent as "Authorization: Bearer <token>"
//
// Locally, backend/scripts/traccar-sim.js serves the same subset of the API
// with simulated vehicles, so this module can be developed without a server.

const TIMEOUT_MS = 8000;
const KNOTS_TO_KMH = 1.852;

const config = () => ({
  url: (process.env.TRACCAR_URL || "").trim().replace(/\/+$/, ""),
  token: (process.env.TRACCAR_TOKEN || "").trim(),
});

const isConfigured = () => {
  const { url, token } = config();
  return !!(url && token);
};

const buildQuery = (query) => {
  if (!query) return "";
  const parts = [];
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v instanceof Date ? v.toISOString() : v)}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
};

const request = async (path, { method = "GET", query, body } = {}) => {
  const { url, token } = config();
  if (!url || !token) {
    throw new HttpError(503, "GPS sunucusu henüz ayarlanmadı.", "TRACCAR_NOT_CONFIGURED");
  }

  let res;
  try {
    res = await fetch(`${url}/api${path}${buildQuery(query)}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error(`[traccar] ${method} ${path} failed:`, err.message);
    throw new HttpError(502, "GPS sunucusuna ulaşılamadı.", "TRACCAR_UNREACHABLE");
  }

  if (!res.ok) {
    console.error(`[traccar] ${method} ${path} -> HTTP ${res.status}`);
    const code = res.status === 401 || res.status === 403 ? "TRACCAR_AUTH" : "TRACCAR_ERROR";
    throw new HttpError(502, `GPS sunucusu hata verdi (${res.status}).`, code);
  }
  if (res.status === 204) return null;
  return res.json();
};

const listDevices = () => request("/devices");

const findDeviceByUniqueId = async (uniqueId) => {
  const devices = await request("/devices", { query: { uniqueId } });
  return (devices || []).find((d) => d.uniqueId === uniqueId) || null;
};

const createDevice = ({ name, uniqueId }) => request("/devices", { method: "POST", body: { name, uniqueId } });

const updateDevice = (device) => request(`/devices/${device.id}`, { method: "PUT", body: device });

// Without parameters Traccar returns the latest position of every device the
// user can see — one request for the whole fleet map.
const latestPositions = () => request("/positions");

const getPosition = async (positionId) => {
  if (!positionId) return null;
  const positions = await request("/positions", { query: { id: positionId } });
  return (positions || [])[0] || null;
};

const positionsBetween = (deviceId, from, to) =>
  request("/positions", { query: { deviceId, from: new Date(from), to: new Date(to) } });

const knotsToKmh = (knots) => (Number.isFinite(knots) ? Math.round(knots * KNOTS_TO_KMH) : null);

const percentOrNull = (v) => (Number.isFinite(v) && v >= 0 && v <= 100 ? v : null);

// Fuel (Faz 4): a CAN reader reports the tank level in percent as
// "fuelLevel" (Teltonika IO 89); an electric car's charge comes as
// "energyLevel" (IO 152/411). "batteryLevel" is the tracker's own battery
// and "fuel" is litres, so neither is used here.
const fuelFromAttributes = (a = {}) => {
  const fuel = percentOrNull(a.fuelLevel);
  if (fuel != null) return { percent: Math.round(fuel), source: "fuel" };
  const energy = percentOrNull(a.energyLevel);
  if (energy != null) return { percent: Math.round(energy), source: "battery" };
  return null;
};

// Percent -> the 0-8 "eighths" the hand-over forms use.
const percentToEighths = (percent) => Math.min(8, Math.max(0, Math.round(percent / 12.5)));

// Traccar position -> the shape the admin UI uses. Speed comes in knots and
// distances in meters.
const normalizePosition = (p) => {
  if (!p) return null;
  const a = p.attributes || {};
  const odometerM = Number.isFinite(a.odometer) ? a.odometer : Number.isFinite(a.totalDistance) ? a.totalDistance : null;
  return {
    latitude: p.latitude,
    longitude: p.longitude,
    course: Number.isFinite(p.course) ? Math.round(p.course) : null,
    speedKmh: knotsToKmh(p.speed),
    fixTime: p.fixTime || p.deviceTime || p.serverTime || null,
    valid: p.valid !== false,
    ignition: typeof a.ignition === "boolean" ? a.ignition : null,
    motion: typeof a.motion === "boolean" ? a.motion : null,
    odometerKm: odometerM != null ? Math.round(odometerM / 1000) : null,
    fuel: fuelFromAttributes(a),
  };
};

module.exports = {
  isConfigured,
  listDevices,
  findDeviceByUniqueId,
  createDevice,
  updateDevice,
  latestPositions,
  getPosition,
  positionsBetween,
  knotsToKmh,
  percentToEighths,
  normalizePosition,
};
