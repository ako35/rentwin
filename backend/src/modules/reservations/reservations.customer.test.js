// Customer reservation routes (any registered user, own bookings) must embed
// only the public vehicle allow-list; the admin reservation routes and the
// (admin-only) contract serializer keep the full fleet record.
// Run: node --test src/modules/reservations/reservations.customer.test.js
//
// Same approach as vehicles.public.test.js: the real handlers run against an
// in-memory Prisma stand-in injected through require.cache, so pointing a
// customer handler back at serializeReservation fails here.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const PRIVATE = {
  licensePlate: "35 RZV 001",
  chassisNo: "VF1RZV000CHASSIS1",
  engineNo: "ENG-RZV-4455",
  registrationSerialNo: "ER-RZV-7788",
  registrationDate: new Date("2024-04-01"),
  notes: "İç not: arka tampon göçük",
  saleNote: "Satış notu gizli",
  passiveNote: "Pasif notu gizli",
  currentKm: 73120,
  currentFuelEighths: 3,
  currentFuelPercent: 40,
  nextMaintenanceDate: new Date("2026-12-15"),
  nextMaintenanceKm: 80000,
  maintenanceIntervalKm: 10000,
  nextInspectionDate: new Date("2027-03-01"),
  trackInsurance: true,
  trackKasko: true,
  trackTax: false,
  trackInspection: true,
  trackMaintenance: true,
  branchId: "branch-secret-rzv",
  builtIn: false,
  outOfService: false,
  soldAt: null,
  passiveAt: null,
  // A column added to Vehicle later: must stay private by default.
  someFutureColumn: "future-secret-rzv",
};

const CAR = {
  id: "11111111-1111-1111-1111-111111111111",
  brand: "Renault",
  model: "Clio",
  modelYear: 2024,
  transmission: "Automatic",
  fuelType: "Gasoline",
  bodyType: "BINEK",
  color: "Gri",
  dailyPrice: 1800,
  monthlyPrice: 32000,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-06-01"),
  images: [{ id: "img-clio", createdAt: new Date("2025-01-01") }],
  ...PRIVATE,
};

const CUSTOMER = { id: "user-customer-1", roles: ["Customer"] };
const OTHER_CUSTOMER = { id: "user-customer-2", roles: ["Customer"] };
const ADMIN = { id: "user-admin-1", roles: ["Administrator"] };

let reservations;
let nextId;
const resetDb = () => {
  nextId = 1;
  reservations = [
    {
      id: "rsv-own-1",
      userId: CUSTOMER.id,
      carId: CAR.id,
      pickUpLocation: "İzmir Havalimanı",
      dropOffLocation: "Aliağa",
      pickUpTime: new Date("2026-12-01T09:00:00Z"),
      dropOffTime: new Date("2026-12-05T09:00:00Z"),
      status: "PENDING",
      note: null,
      createdAt: new Date("2026-11-01"),
      updatedAt: new Date("2026-11-01"),
    },
    {
      id: "rsv-other-1",
      userId: OTHER_CUSTOMER.id,
      carId: CAR.id,
      pickUpLocation: "Karşıyaka",
      dropOffLocation: "Karşıyaka",
      pickUpTime: new Date("2026-12-10T09:00:00Z"),
      dropOffTime: new Date("2026-12-12T09:00:00Z"),
      status: "CONFIRMED",
      note: null,
      createdAt: new Date("2026-11-02"),
      updatedAt: new Date("2026-11-02"),
    },
  ];
};
resetDb();

// Resolves the `include` the handlers pass (CAR_INCLUDE, plus user/contract on
// the admin detail route) against the in-memory rows.
const withIncludes = (row, include = {}) => {
  const out = { ...row };
  if (include.car) out.car = { ...CAR };
  if (include.user) out.user = { id: row.userId, firstName: "Ayşe", lastName: "Yılmaz", email: "a@example.test" };
  if (include.contract) out.contract = null;
  return out;
};

const fakePrisma = {
  vehicle: { findUnique: async ({ where }) => (where.id === CAR.id ? { ...CAR } : null) },
  contract: { findFirst: async () => null },
  user: { findUnique: async ({ where }) => ({ id: where.id }) },
  reservation: {
    findFirst: async () => null,
    findUnique: async ({ where, include }) => {
      const row = reservations.find((r) => r.id === where.id);
      return row ? withIncludes(row, include) : null;
    },
    findMany: async ({ where = {}, include } = {}) =>
      reservations.filter((r) => !where.userId || r.userId === where.userId).map((r) => withIncludes(r, include)),
    count: async ({ where = {} } = {}) => reservations.filter((r) => !where.userId || r.userId === where.userId).length,
    create: async ({ data, include }) => {
      const row = { id: `rsv-new-${nextId++}`, createdAt: new Date(), updatedAt: new Date(), ...data };
      reservations.push(row);
      return withIncludes(row, include);
    },
    update: async ({ where, data, include }) => {
      const row = reservations.find((r) => r.id === where.id);
      Object.assign(row, data);
      return withIncludes(row, include);
    },
  },
};

const prismaPath = path.resolve(__dirname, "../../lib/prisma.js");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };

const {
  PUBLIC_VEHICLE_FIELDS,
  serializeContract,
  serializeCustomerReservation,
  serializeReservation,
} = require("../../lib/serializers");
const customer = require("./reservations.controller");
const admin = require("./reservations.admin.controller");

const PUBLIC_KEYS = new Set([...PUBLIC_VEHICLE_FIELDS, "image"]);
const PRIVATE_KEYS = [...Object.keys(PRIVATE), "images", "branch"];
const SECRET_VALUES = [
  PRIVATE.licensePlate,
  PRIVATE.chassisNo,
  PRIVATE.engineNo,
  PRIVATE.registrationSerialNo,
  PRIVATE.notes,
  PRIVATE.saleNote,
  PRIVATE.passiveNote,
  PRIVATE.branchId,
  PRIVATE.someFutureColumn,
];

// Runs an asyncHandler-wrapped Express handler; resolves with what it sent,
// rejects with the error it passed to next().
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
    handler({ params: {}, query: {}, body: {}, ...req }, res, (err) => (err ? reject(err) : resolve(undefined)));
  });

const assertCustomerCar = (car) => {
  assert.ok(car, "reservation must still embed its car");
  assert.deepEqual(Object.keys(car).sort(), [...PUBLIC_KEYS].sort());
  for (const key of PRIVATE_KEYS) assert.equal(key in car, false, `customer payload has car.${key}`);
  // What the customer UI actually renders.
  assert.equal(car.model, "Clio");
  assert.equal(car.transmission, "Automatic");
  assert.equal(car.fuelType, "Gasoline");
  assert.deepEqual(car.image, ["img-clio"]);
};

const assertNoSecrets = (body) => {
  const json = JSON.stringify(body);
  for (const secret of SECRET_VALUES) assert.equal(json.includes(secret), false, `response contains "${secret}"`);
};

const assertFullCar = (car) => {
  assert.equal(car.licensePlate, PRIVATE.licensePlate);
  assert.equal(car.chassisNo, PRIVATE.chassisNo);
  assert.equal(car.engineNo, PRIVATE.engineNo);
  assert.equal(car.registrationSerialNo, PRIVATE.registrationSerialNo);
  assert.equal(car.notes, PRIVATE.notes);
  assert.equal(car.currentKm, PRIVATE.currentKm);
  assert.equal(car.branchId, PRIVATE.branchId);
  assert.deepEqual(car.image, ["img-clio"]);
};

test("serializeCustomerReservation keeps reservation fields, trims the car", () => {
  const row = withIncludes(reservations[0], { car: true });
  const out = serializeCustomerReservation(row);
  assertCustomerCar(out.car);
  assertNoSecrets(out);
  for (const key of ["id", "userId", "carId", "pickUpLocation", "dropOffLocation", "pickUpTime", "dropOffTime", "status"]) {
    assert.deepEqual(out[key], row[key], `reservation.${key} must pass through`);
  }
  assert.equal(serializeCustomerReservation(reservations[0]).car, undefined);
});

test("POST /reservations/add returns the new booking with a public-only car", async () => {
  resetDb();
  const { status, body } = await call(customer.createReservation, {
    user: CUSTOMER,
    query: { carId: CAR.id },
    body: {
      pickUpTime: "01/10/2027 10:00:00",
      dropOffTime: "01/14/2027 10:00:00",
      pickUpLocation: "İzmir Havalimanı",
      dropOffLocation: "İzmir Havalimanı",
    },
  });
  assert.equal(status, 201);
  assert.equal(body.userId, CUSTOMER.id);
  assert.equal(body.status, "PENDING");
  assertCustomerCar(body.car);
  assertNoSecrets(body);
});

test("GET /reservations/auth/all lists only the caller's bookings, public-only cars", async () => {
  resetDb();
  const { status, body } = await call(customer.getMyReservationsByPage, {
    user: CUSTOMER,
    query: { page: "0", size: "20", sort: "pickUpTime", direction: "DESC" },
  });
  assert.equal(status, 200);
  assert.deepEqual(body.content.map((r) => r.id), ["rsv-own-1"]);
  assert.equal(body.totalPages, 1);
  assert.equal(body.pageable.pageNumber, 0);
  body.content.forEach((r) => assertCustomerCar(r.car));
  assertNoSecrets(body);
});

test("GET /reservations/:id/auth: owner gets public-only car, others get 403", async () => {
  resetDb();
  const own = await call(customer.getReservationById, { user: CUSTOMER, params: { id: "rsv-own-1" } });
  assert.equal(own.status, 200);
  assertCustomerCar(own.body.car);
  assertNoSecrets(own.body);

  await assert.rejects(
    call(customer.getReservationById, { user: OTHER_CUSTOMER, params: { id: "rsv-own-1" } }),
    (err) => err.status === 403
  );

  // An admin reading through the customer route gets the customer shape too;
  // the admin screens use /reservations/admin/:id/auth (tested below).
  const asAdmin = await call(customer.getReservationById, { user: ADMIN, params: { id: "rsv-own-1" } });
  assertCustomerCar(asAdmin.body.car);
});

test("admin reservation routes keep the full car record", async () => {
  resetDb();
  const detail = await call(admin.getReservationByIdAdmin, { user: ADMIN, params: { id: "rsv-own-1" } });
  assertFullCar(detail.body.car);

  const created = await call(admin.createReservationAdmin, {
    user: ADMIN,
    body: {
      carId: CAR.id,
      userId: CUSTOMER.id,
      pickUpTime: "02/01/2027 10:00:00",
      dropOffTime: "02/03/2027 10:00:00",
      pickUpLocation: "Aliağa",
    },
  });
  assert.equal(created.status, 201);
  assertFullCar(created.body.car);

  const updated = await call(admin.updateReservationAdmin, {
    user: ADMIN,
    params: { id: "rsv-own-1" },
    body: { note: "Müşteri erken gelecek" },
  });
  assertFullCar(updated.body.car);

  const confirmed = await call(admin.confirmReservation, { user: ADMIN, params: { id: "rsv-own-1" } });
  assert.equal(confirmed.body.status, "CONFIRMED");
  assertFullCar(confirmed.body.car);
});

test("serializeReservation / serializeContract (admin-only) keep the full car record", () => {
  assertFullCar(serializeReservation({ id: "r", car: { ...CAR } }).car);
  assertFullCar(serializeContract({ id: "c", car: { ...CAR } }).car);
});

// Route wiring: every non-admin reservation route must be served by a handler
// from the customer controller (never an admin handler), and every contract
// route is admin-only — there is no customer contract endpoint to trim.
const routeTable = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods),
      handles: layer.route.stack.map((s) => s.handle),
    }));

test("customer reservation routes are wired to the customer handlers", () => {
  const requireAdmin = require("../../middleware/require-admin");
  const routes = routeTable(require("./reservations.routes"));
  const adminHandlers = new Set(Object.values(admin));
  const customerHandlers = new Set(Object.values(customer));

  const open = routes.filter((r) => !r.handles.includes(requireAdmin));
  assert.deepEqual(
    open.map((r) => `${r.methods.join(",").toUpperCase()} ${r.path}`).sort(),
    [
      "GET /reservations/:id/auth",
      "GET /reservations/auth",
      "GET /reservations/auth/all",
      "POST /reservations/add",
    ],
    "a new non-admin reservation route needs a customer serializer and a test here"
  );
  for (const r of open) {
    const handler = r.handles[r.handles.length - 1];
    assert.ok(customerHandlers.has(handler), `${r.path} must use a customer handler`);
    assert.equal(adminHandlers.has(handler), false, `${r.path} must not use an admin handler`);
  }
});

test("every contract route requires an administrator", () => {
  const requireAdmin = require("../../middleware/require-admin");
  const routes = routeTable(require("../contracts/contracts.routes"));
  assert.ok(routes.length > 0);
  for (const r of routes) assert.ok(r.handles.includes(requireAdmin), `${r.path} is not admin-only`);
});
