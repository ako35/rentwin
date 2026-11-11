// The unauthenticated /car/visitors/* routes must expose only the public
// allow-list (serializePublicVehicle); the admin routes keep the full record.
// Run: node --test src/modules/vehicles/vehicles.public.test.js
//
// The handlers are exercised for real against an in-memory Prisma stand-in
// (injected through require.cache before the controller loads), so swapping a
// public handler back to serializeVehicle fails here — not just a change to
// the serializer itself.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const PRIVATE = {
  licensePlate: "35 TST 001",
  chassisNo: "WF0XXTTGXXX123456",
  engineNo: "ENG-998877",
  registrationSerialNo: "ER-445566",
  registrationDate: new Date("2024-03-01"),
  notes: "İç not: sağ ayna çizik",
  saleNote: "Satış notu gizli",
  passiveNote: "Pasif notu gizli",
  currentKm: 48213,
  currentFuelEighths: 5,
  currentFuelPercent: 62,
  nextMaintenanceDate: new Date("2026-12-01"),
  nextMaintenanceKm: 60000,
  maintenanceIntervalKm: 10000,
  nextInspectionDate: new Date("2027-02-01"),
  trackInsurance: true,
  trackKasko: false,
  trackTax: true,
  trackInspection: true,
  trackMaintenance: true,
  branchId: "branch-secret-1",
  builtIn: false,
};

const makeVehicle = (id, overrides = {}) => ({
  id,
  brand: "Ford",
  model: "Transit",
  modelYear: 2023,
  transmission: "Manual",
  fuelType: "Diesel",
  bodyType: "PANELVAN",
  color: "Beyaz",
  dailyPrice: 2500,
  monthlyPrice: 45000,
  outOfService: false,
  soldAt: null,
  passiveAt: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-06-01"),
  images: [{ id: `img-${id}`, createdAt: new Date("2025-01-01") }],
  branch: { id: "branch-secret-1", name: "Gizli Şube", code: "GZL" },
  ...PRIVATE,
  ...overrides,
});

const FLEET = [
  makeVehicle("00000000-0000-0000-0000-000000000001"),
  makeVehicle("00000000-0000-0000-0000-000000000002", {
    licensePlate: "35 TST 002",
    createdAt: new Date("2025-02-01"),
    // A column added to Vehicle after this change: must stay private.
    someFutureColumn: "future-secret-value",
  }),
];

// Equality filter over the plain columns the public/admin "where" uses
// (soldAt: null, outOfService: false, …); relation/operator filters are
// ignored — none of the paths under test rely on them.
const matches = (row, where = {}) =>
  Object.entries(where).every(([key, value]) =>
    value === null || typeof value !== "object" ? (row[key] ?? null) === value : true
  );

const fakePrisma = {
  vehicle: {
    findUnique: async ({ where }) => FLEET.find((v) => v.id === where.id) || null,
    findMany: async ({ where } = {}) => FLEET.filter((v) => matches(v, where)),
    count: async ({ where } = {}) => FLEET.filter((v) => matches(v, where)).length,
  },
  vehicleModelImage: { findMany: async () => [] },
  contract: {
    groupBy: async () => [],
    findMany: async () => [],
    findFirst: async () => null,
  },
  reservation: { findMany: async () => [], findFirst: async () => null },
};

const prismaPath = path.resolve(__dirname, "../../lib/prisma.js");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };

const {
  serializeVehicle,
  serializePublicVehicle,
  PUBLIC_VEHICLE_FIELDS,
  modelImageKey,
} = require("../../lib/serializers");
const controller = require("./vehicles.controller");

const PRIVATE_KEYS = [...Object.keys(PRIVATE), "branch", "images", "someFutureColumn", "outOfService", "soldAt", "passiveAt"];
const PUBLIC_KEYS = new Set([...PUBLIC_VEHICLE_FIELDS, "image"]);
const SECRET_VALUES = [
  "35 TST 001",
  "35 TST 002",
  PRIVATE.chassisNo,
  PRIVATE.engineNo,
  PRIVATE.registrationSerialNo,
  PRIVATE.notes,
  PRIVATE.saleNote,
  PRIVATE.passiveNote,
  "branch-secret-1",
  "Gizli Şube",
  "future-secret-value",
];

// Runs an asyncHandler-wrapped Express handler and resolves with what it sent.
const call = (handler, req = {}) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body });
        return this;
      },
    };
    handler({ params: {}, query: {}, ...req }, res, (err) => (err ? reject(err) : resolve(undefined)));
  });

const assertPublicOnly = (item, extraKeys = []) => {
  const allowed = new Set([...PUBLIC_KEYS, ...extraKeys]);
  for (const key of Object.keys(item)) assert.ok(allowed.has(key), `public payload leaks "${key}"`);
  for (const key of PRIVATE_KEYS) assert.equal(key in item, false, `public payload has "${key}"`);
};

const assertNoSecrets = (body) => {
  const json = JSON.stringify(body);
  for (const secret of SECRET_VALUES) assert.equal(json.includes(secret), false, `response contains "${secret}"`);
};

test("serializePublicVehicle keeps only the public allow-list", () => {
  const out = serializePublicVehicle(FLEET[1]);
  assert.deepEqual(Object.keys(out).sort(), [...PUBLIC_KEYS].sort());
  for (const key of ["licensePlate", "chassisNo", "engineNo", "registrationSerialNo", "notes"]) {
    assert.equal(key in out, false, `${key} must not be public`);
  }
  assert.equal("someFutureColumn" in out, false, "new columns are private by default");
  assert.equal(out.brand, "Ford");
  assert.equal(out.dailyPrice, 2500);
  assert.deepEqual(out.image, [`img-${FLEET[1].id}`]);
  // The landing pages' groupFleetByModel picks each model's canonical unit
  // by createdAt, and filters on bodyType — both must stay public.
  assert.deepEqual(out.createdAt, FLEET[1].createdAt);
  assert.equal(out.bodyType, "PANELVAN");
});

test("serializePublicVehicle drops every sensitive field, even when set", () => {
  const out = JSON.parse(JSON.stringify(serializePublicVehicle(FLEET[0])));
  for (const key of [
    "licensePlate",
    "chassisNo",
    "engineNo",
    "registrationSerialNo",
    "registrationDate",
    "notes",
    "saleNote",
    "passiveNote",
    "currentKm",
    "currentFuelEighths",
    "currentFuelPercent",
    "nextMaintenanceDate",
    "nextMaintenanceKm",
    "maintenanceIntervalKm",
    "nextInspectionDate",
    "trackInsurance",
    "trackKasko",
    "trackTax",
    "trackInspection",
    "trackMaintenance",
    "branchId",
    "branch",
    "builtIn",
    "outOfService",
    "soldAt",
    "passiveAt",
    "updatedAt",
    "images",
  ]) {
    assert.equal(key in out, false, `${key} must not be public`);
  }
  assertNoSecrets(out);
});

test("serializePublicVehicle resolves the model image like serializeVehicle", () => {
  const map = new Map([[modelImageKey("Ford", "Transit"), { id: "model-img-1" }]]);
  assert.deepEqual(serializePublicVehicle(FLEET[0], map).image, ["model-img-1"]);
  assert.deepEqual(serializePublicVehicle(FLEET[0], map).image, serializeVehicle(FLEET[0], map).image);
});

test("serializePublicVehicle fills missing public fields with null", () => {
  const out = serializePublicVehicle({ id: "x", brand: "Fiat", model: "Egea", images: [] });
  assert.equal(out.modelYear, null);
  assert.equal(out.monthlyPrice, null);
  assert.deepEqual(out.image, []);
});

test("serializeVehicle (admin) still returns the full record", () => {
  const out = serializeVehicle(FLEET[0]);
  assert.equal(out.licensePlate, "35 TST 001");
  assert.equal(out.chassisNo, PRIVATE.chassisNo);
  assert.equal(out.engineNo, PRIVATE.engineNo);
  assert.equal(out.registrationSerialNo, PRIVATE.registrationSerialNo);
  assert.equal(out.notes, PRIVATE.notes);
  assert.equal(out.currentKm, PRIVATE.currentKm);
});

test("GET /car/visitors/all returns public fields only", async () => {
  const { status, body } = await call(controller.getAllVehicles);
  assert.equal(status, 200);
  assert.equal(body.length, FLEET.length);
  body.forEach((item) => assertPublicOnly(item));
  assertNoSecrets(body);
});

test("GET /car/visitors/pages returns public fields only (plain and distinctModel)", async () => {
  for (const query of [{ page: "0", size: "6" }, { page: "0", size: "8", distinctModel: "1" }]) {
    const { status, body } = await call(controller.getVehiclesByPage, { query });
    assert.equal(status, 200);
    assert.ok(body.content.length > 0);
    body.content.forEach((item) => assertPublicOnly(item));
    assertNoSecrets(body);
  }
});

test("GET /car/visitors/:id returns public fields plus canonicalId and modelInfo", async () => {
  const { status, body } = await call(controller.getVehicleById, { params: { id: FLEET[1].id } });
  assert.equal(status, 200);
  assertPublicOnly(body, ["canonicalId", "modelInfo"]);
  assertNoSecrets(body);
  // The second Transit unit points at the first (earliest) unit's page.
  assert.equal(body.canonicalId, FLEET[0].id);
  assert.equal(body.modelInfo.variants.count, 2);
  assert.ok("copy" in body.modelInfo);
});

test("admin routes keep returning the full record", async () => {
  const all = await call(controller.getAllVehiclesAdmin);
  assert.equal(all.body.length, FLEET.length);
  assert.equal(all.body[0].licensePlate, "35 TST 001");
  assert.equal(all.body[0].chassisNo, PRIVATE.chassisNo);
  assert.equal(all.body[0].engineNo, PRIVATE.engineNo);
  assert.equal(all.body[0].registrationSerialNo, PRIVATE.registrationSerialNo);
  assert.equal(all.body[0].notes, PRIVATE.notes);
  assert.equal(all.body[0].currentKm, PRIVATE.currentKm);

  const one = await call(controller.getVehicleByIdAdmin, { params: { id: FLEET[0].id } });
  assert.equal(one.body.licensePlate, "35 TST 001");
  assert.equal(one.body.notes, PRIVATE.notes);
  assert.equal(one.body.status, "AVAILABLE");

  const pages = await call(controller.getVehiclesByPageAdmin, { query: { page: "0", size: "20" } });
  assert.equal(pages.body.content[0].licensePlate, "35 TST 001");
  assert.equal(pages.body.content[0].chassisNo, PRIVATE.chassisNo);
});
