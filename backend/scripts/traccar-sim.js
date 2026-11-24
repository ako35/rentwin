// Local stand-in for a Traccar server, for developing the GPS tracking screens
// before the VPS and the devices exist (docs/gps-takip-yol-haritasi.md).
//
//   node scripts/traccar-sim.js
//
// It serves the part of Traccar's REST API that lib/traccar.js uses
// (/api/devices, /api/positions) with simulated vehicles driving around
// Aliağa, and forwards ignition / overspeed / alarm events to Rentwin's
// webhook the way Traccar's event forwarding does. Positions live in memory
// only; registered devices are remembered in a small JSON file in the OS temp
// folder so a restart doesn't orphan the IMEIs saved in Rentwin.
//
// Matching backend/.env values for local development:
//   TRACCAR_URL=http://localhost:8082
//   TRACCAR_TOKEN=dev-traccar-token
//   TELEMATICS_WEBHOOK_SECRET=dev-webhook-secret
//
// By default the token, webhook secret and backend port are read from
// backend/.env, so the simulator and the backend always agree. Overrides
// (env): SIM_PORT (8082), SIM_TOKEN, SIM_WEBHOOK_URL, SIM_WEBHOOK_SECRET,
// SIM_TICK_SECONDS (10), SIM_SPEEDUP (3: the map visibly moves),
// SIM_HISTORY_HOURS (48), SIM_RENTWIN_TICK_SECONDS (60; 0 = off).
//
// Like the timer on the real GPS server, it also calls Rentwin's periodic
// check (POST /api/telematics/tick) every SIM_RENTWIN_TICK_SECONDS.
//
// Extra endpoints for testing alerts (no token needed):
//   POST /sim/alarm?uniqueId=<imei>&alarm=powerCut   (or tow, lowBattery, ...)
//   POST /sim/tow?uniqueId=<imei>                    moves with the engine off
//   POST /sim/goto?uniqueId=<imei>&place=office      parks at the office
//   POST /sim/goto?uniqueId=<imei>&place=far         parks ~450 km away (Ankara)
//   POST /sim/drive?uniqueId=<imei>&km=250           adds km to the odometer
//   POST /sim/rentwin-tick                           runs Rentwin's check now
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const dotenv = require("dotenv");

// Parsed, not loaded into process.env: a launcher may set PORT for the
// simulator itself, which must not be mistaken for the backend's port.
const backendEnv = (() => {
  try {
    return dotenv.parse(fs.readFileSync(path.join(__dirname, "..", ".env")));
  } catch {
    return {};
  }
})();

const PORT = Number(process.env.SIM_PORT || 8082);
const TOKEN = process.env.SIM_TOKEN || backendEnv.TRACCAR_TOKEN || "dev-traccar-token";
const WEBHOOK_URL =
  process.env.SIM_WEBHOOK_URL || `http://localhost:${backendEnv.PORT || 4000}/api/telematics/webhook`;
const WEBHOOK_SECRET = process.env.SIM_WEBHOOK_SECRET || backendEnv.TELEMATICS_WEBHOOK_SECRET || "dev-webhook-secret";
const TICK_SECONDS = Number(process.env.SIM_TICK_SECONDS || 10);
const RENTWIN_TICK_SECONDS = Number(process.env.SIM_RENTWIN_TICK_SECONDS ?? 60);
const RENTWIN_TICK_URL = WEBHOOK_URL.replace(/\/webhook$/, "/tick");
const SPEEDUP = Number(process.env.SIM_SPEEDUP || 3);
const HISTORY_HOURS = Number(process.env.SIM_HISTORY_HOURS || 48);
const STATE_FILE = path.join(os.tmpdir(), "rentwin-traccar-sim.json");

const KMH_PER_KNOT = 1.852;
// Used when the device has no speedLimit attribute (Rentwin sets one).
const DEFAULT_OVERSPEED_KMH = 120;
// Rentwin Aliağa office (lib/site.js business.geo); vehicles wander nearby.
const HOME = { lat: 38.7928859, lng: 26.9683881 };
const FAR = { lat: 39.9208, lng: 32.8541 };
const BOX = { minLat: 38.55, maxLat: 38.98, minLng: 26.78, maxLng: 27.25 };

const devices = new Map(); // id -> device
const sims = new Map(); // deviceId -> movement state
const history = new Map(); // deviceId -> positions[]
let nextDeviceId = 1;
let nextPositionId = 1;
let nextEventId = 1;

const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ------------------------------------------------------------- simulation

const newSim = (index) => ({
  lat: HOME.lat + rand(-0.01, 0.01),
  lng: HOME.lng + rand(-0.01, 0.01),
  heading: rand(0, 360),
  speedKmh: 0,
  ignition: false,
  phaseTicks: randInt(2, 8),
  odometerM: randInt(200, 900) * 1000, // a device counts from its own install
  speeder: index === 0, // the first device occasionally speeds, to test alerts
  towTicks: 0,
  parkedTicks: 0,
});

const overspeedKmh = (device) => {
  const knots = Number(device.attributes?.speedLimit);
  return knots > 0 ? knots * KMH_PER_KNOT : DEFAULT_OVERSPEED_KMH;
};

// One step of `seconds` length. Returns the events the step produced.
const step = (sim, seconds, limitKmh = DEFAULT_OVERSPEED_KMH) => {
  const events = [];
  if (sim.towTicks > 0) {
    // On a tow truck: engine off, moving at a steady pace.
    sim.towTicks -= 1;
    sim.ignition = false;
    sim.speedKmh = 35;
    const km = (sim.speedKmh * seconds * SPEEDUP) / 3600;
    sim.lat += km / 111;
    sim.odometerM += Math.round(km * 1000);
    return events;
  }
  if (sim.parkedTicks > 0) {
    sim.parkedTicks -= 1;
    sim.ignition = false;
    sim.speedKmh = 0;
    return events;
  }
  sim.phaseTicks -= 1;
  if (sim.phaseTicks <= 0) {
    sim.ignition = !sim.ignition;
    sim.phaseTicks = sim.ignition ? randInt(20, 70) : randInt(10, 50);
    events.push(sim.ignition ? "ignitionOn" : "ignitionOff");
  }

  if (!sim.ignition) {
    sim.speedKmh = 0;
    return events;
  }

  const cruising = sim.speeder && Math.random() < 0.08 ? rand(125, 150) : rand(25, 95);
  sim.speedKmh = Math.round(sim.speedKmh * 0.5 + cruising * 0.5);
  if (sim.speedKmh > limitKmh) events.push("deviceOverspeed");

  // Steer back toward the office when leaving the box.
  if (sim.lat < BOX.minLat || sim.lat > BOX.maxLat || sim.lng < BOX.minLng || sim.lng > BOX.maxLng) {
    sim.heading = (Math.atan2(HOME.lng - sim.lng, HOME.lat - sim.lat) * 180) / Math.PI;
  } else {
    sim.heading += rand(-25, 25);
  }
  sim.heading = (sim.heading + 360) % 360;

  const km = (sim.speedKmh * seconds * SPEEDUP) / 3600;
  const rad = (sim.heading * Math.PI) / 180;
  sim.lat += (km * Math.cos(rad)) / 111;
  sim.lng += (km * Math.sin(rad)) / (111 * Math.cos((sim.lat * Math.PI) / 180));
  sim.odometerM += Math.round(km * 1000);
  return events;
};

const makePosition = (device, sim, at) => ({
  id: nextPositionId++,
  deviceId: device.id,
  protocol: "teltonika",
  serverTime: at.toISOString(),
  deviceTime: at.toISOString(),
  fixTime: at.toISOString(),
  outdated: false,
  valid: true,
  latitude: Math.round(sim.lat * 1e6) / 1e6,
  longitude: Math.round(sim.lng * 1e6) / 1e6,
  altitude: 0,
  speed: sim.speedKmh / KMH_PER_KNOT,
  course: Math.round(sim.heading),
  address: null,
  accuracy: 8,
  attributes: {
    ignition: sim.ignition,
    motion: sim.speedKmh > 0,
    odometer: sim.odometerM,
    totalDistance: sim.odometerM,
    sat: 11,
  },
});

const record = (device, position) => {
  const list = history.get(device.id);
  list.push(position);
  device.positionId = position.id;
  device.lastUpdate = position.fixTime;
  device.status = "online";
};

// Fill HISTORY_HOURS of past positions (one a minute) so routes can be tested
// right away. No events are forwarded for the backfill.
const backfill = (device, sim) => {
  const end = Date.now();
  for (let t = end - HISTORY_HOURS * 3600 * 1000; t < end; t += 60 * 1000) {
    step(sim, 60 / SPEEDUP); // history at real speed
    record(device, makePosition(device, sim, new Date(t)));
  }
};

const startDevice = (device) => {
  const sim = newSim(sims.size);
  sims.set(device.id, sim);
  history.set(device.id, []);
  backfill(device, sim);
};

// ---------------------------------------------------------------- events

const forward = async (device, type, position, attributes = {}) => {
  const event = {
    id: nextEventId++,
    type,
    eventTime: position.fixTime,
    deviceId: device.id,
    positionId: position.id,
    geofenceId: 0,
    maintenanceId: 0,
    attributes,
  };
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${WEBHOOK_SECRET}` },
      body: JSON.stringify({ event, device, position }),
      signal: AbortSignal.timeout(5000),
    });
    console.log(`[sim] ${device.name} ${type}${attributes.alarm ? `:${attributes.alarm}` : ""} -> webhook ${res.status}`);
  } catch (err) {
    console.log(`[sim] ${device.name} ${type} -> webhook unreachable (${err.message})`);
  }
};

setInterval(() => {
  const now = new Date();
  for (const device of devices.values()) {
    const sim = sims.get(device.id);
    const limitKmh = overspeedKmh(device);
    const events = step(sim, TICK_SECONDS, limitKmh);
    const position = makePosition(device, sim, now);
    record(device, position);
    for (const type of events) {
      forward(device, type, position, type === "deviceOverspeed" ? { speed: position.speed, speedLimit: limitKmh / KMH_PER_KNOT } : {});
    }
  }
  // Keep memory bounded: drop positions older than the history window + 1 day.
  const cutoff = Date.now() - (HISTORY_HOURS + 24) * 3600 * 1000;
  for (const list of history.values()) {
    while (list.length && Date.parse(list[0].fixTime) < cutoff) list.shift();
  }
}, TICK_SECONDS * 1000);

// ------------------------------------------------------------------ state

const saveState = () => {
  const data = [...devices.values()].map(({ id, name, uniqueId, attributes }) => ({ id, name, uniqueId, attributes }));
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
};

const loadState = () => {
  if (!fs.existsSync(STATE_FILE)) return;
  try {
    for (const d of JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))) {
      const device = { id: d.id, name: d.name, uniqueId: d.uniqueId, status: "unknown", lastUpdate: null, positionId: 0, disabled: false, attributes: d.attributes || {} };
      devices.set(device.id, device);
      nextDeviceId = Math.max(nextDeviceId, d.id + 1);
      startDevice(device);
    }
  } catch (err) {
    console.log(`[sim] could not read ${STATE_FILE}: ${err.message}`);
  }
};

// ------------------------------------------------------------------- http

const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve(null);
      }
    });
  });

const callRentwinTick = async () => {
  try {
    const res = await fetch(RENTWIN_TICK_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` },
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.json().catch(() => null);
    console.log(`[sim] rentwin tick -> ${res.status} ${body ? JSON.stringify(body) : ""}`);
    return body;
  } catch (err) {
    console.log(`[sim] rentwin tick unreachable (${err.message})`);
    return null;
  }
};
if (RENTWIN_TICK_SECONDS > 0) setInterval(callRentwinTick, RENTWIN_TICK_SECONDS * 1000);

// Record a position right away (outside the regular step) so tests need not
// wait for the next simulation tick.
const recordNow = (device) => {
  const position = makePosition(device, sims.get(device.id), new Date());
  record(device, position);
  return position;
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const q = url.searchParams;

  if (url.pathname.startsWith("/sim/") && req.method === "POST") {
    if (url.pathname === "/sim/rentwin-tick") return send(res, 200, await callRentwinTick());
    const device = [...devices.values()].find((d) => d.uniqueId === q.get("uniqueId"));
    if (!device) return send(res, 404, { message: "unknown uniqueId" });
    const sim = sims.get(device.id);
    const list = history.get(device.id);

    if (url.pathname === "/sim/alarm") {
      await forward(device, "alarm", list[list.length - 1], { alarm: q.get("alarm") || "powerCut" });
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/sim/tow") {
      sim.towTicks = 12;
      step(sim, TICK_SECONDS);
      const position = recordNow(device);
      await forward(device, "deviceMoving", position);
      return send(res, 200, { ok: true, speedKmh: sim.speedKmh, ignition: sim.ignition });
    }
    if (url.pathname === "/sim/goto") {
      const place = q.get("place") === "far" ? FAR : HOME;
      sim.lat = place.lat + rand(-0.0004, 0.0004);
      sim.lng = place.lng + rand(-0.0004, 0.0004);
      sim.ignition = false;
      sim.speedKmh = 0;
      sim.towTicks = 0;
      sim.parkedTicks = Number(q.get("ticks") || 60);
      recordNow(device);
      return send(res, 200, { ok: true, place: q.get("place") || "office" });
    }
    if (url.pathname === "/sim/drive") {
      sim.odometerM += Math.round(Number(q.get("km") || 100) * 1000);
      const position = recordNow(device);
      return send(res, 200, { ok: true, odometerKm: Math.round(position.attributes.odometer / 1000) });
    }
    return send(res, 404, { message: "unknown sim action" });
  }

  if ((req.headers.authorization || "") !== `Bearer ${TOKEN}`) return send(res, 401, { message: "Unauthorized" });

  if (url.pathname === "/api/devices" && req.method === "GET") {
    const uid = q.get("uniqueId");
    return send(res, 200, [...devices.values()].filter((d) => !uid || d.uniqueId === uid));
  }

  if (url.pathname === "/api/devices" && req.method === "POST") {
    const body = await readBody(req);
    if (!body?.uniqueId || !body?.name) return send(res, 400, { message: "name and uniqueId required" });
    if ([...devices.values()].some((d) => d.uniqueId === body.uniqueId)) {
      return send(res, 400, { message: "Duplicate uniqueId" });
    }
    const device = { id: nextDeviceId++, name: body.name, uniqueId: body.uniqueId, status: "unknown", lastUpdate: null, positionId: 0, disabled: false, attributes: body.attributes || {} };
    devices.set(device.id, device);
    startDevice(device);
    saveState();
    console.log(`[sim] device registered: ${device.name} (${device.uniqueId})`);
    return send(res, 200, device);
  }

  const putMatch = url.pathname.match(/^\/api\/devices\/(\d+)$/);
  if (putMatch && req.method === "PUT") {
    const device = devices.get(Number(putMatch[1]));
    if (!device) return send(res, 404, { message: "not found" });
    const body = await readBody(req);
    if (body?.name) device.name = body.name;
    if (body?.attributes && typeof body.attributes === "object") device.attributes = body.attributes;
    saveState();
    return send(res, 200, device);
  }

  if (url.pathname === "/api/positions" && req.method === "GET") {
    const ids = q.getAll("id").map(Number);
    if (ids.length) {
      const all = [...history.values()].flat();
      return send(res, 200, all.filter((p) => ids.includes(p.id)));
    }
    const deviceId = Number(q.get("deviceId"));
    if (deviceId) {
      const from = Date.parse(q.get("from"));
      const to = Date.parse(q.get("to"));
      if (Number.isNaN(from) || Number.isNaN(to)) return send(res, 400, { message: "from/to required" });
      const list = history.get(deviceId) || [];
      return send(res, 200, list.filter((p) => {
        const t = Date.parse(p.fixTime);
        return t >= from && t <= to;
      }));
    }
    const latest = [];
    for (const list of history.values()) if (list.length) latest.push(list[list.length - 1]);
    return send(res, 200, latest);
  }

  send(res, 404, { message: "not found" });
});

loadState();
server.listen(PORT, () => {
  console.log(`[sim] Traccar simulator on http://localhost:${PORT} — ${devices.size} device(s)`);
  console.log(`[sim] events -> ${WEBHOOK_URL}`);
  if (RENTWIN_TICK_SECONDS > 0) console.log(`[sim] periodic check -> ${RENTWIN_TICK_URL} every ${RENTWIN_TICK_SECONDS}s`);
});
