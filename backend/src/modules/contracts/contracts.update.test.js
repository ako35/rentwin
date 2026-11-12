// The contract screen saves the whole form on every "Kaydet". A closed (DONE /
// CANCELLED) contract keeps its Yönetici Notu editable, so a save that only
// changes the note must work even after the contract's car was sold or set
// passive — while a real change of car or dates still goes through the
// availability check.
// Run: node --test src/modules/contracts/contracts.update.test.js
//
// Same approach as reservations.customer.test.js: the real handler runs
// against an in-memory Prisma stand-in injected through require.cache.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { parseFrontendDateTime } = require("../../lib/dates");

const PICK_UP = "11/01/2026 10:00:00";
const DROP_OFF = "11/05/2026 10:00:00";

const SOLD_CAR = {
  id: "car-sold-1",
  brand: "Fiat",
  model: "Egea",
  licensePlate: "35 ABC 001",
  soldAt: new Date("2026-11-10"),
  passiveAt: null,
  images: [],
};

let contract;
let updates;
const resetDb = (status = "DONE") => {
  updates = [];
  contract = {
    id: "contract-1",
    contractNo: "K-2026-00001",
    carId: SOLD_CAR.id,
    userId: "user-1",
    status,
    pickUpLocation: "Aliağa",
    dropOffLocation: "Aliağa",
    pickUpTime: parseFrontendDateTime(PICK_UP),
    dropOffTime: parseFrontendDateTime(DROP_OFF),
    adminNote: null,
    adminNoteAt: null,
    adminNoteBy: null,
  };
};
resetDb();

const fakePrisma = {
  contract: {
    findUnique: async ({ where, include }) => {
      if (where.id !== contract.id) return null;
      const row = { ...contract };
      if (include?.car) row.car = { ...SOLD_CAR };
      if (include?.extensions) row.extensions = [];
      return row;
    },
    findFirst: async () => null,
    update: async ({ where, data }) => {
      assert.equal(where.id, contract.id);
      updates.push(data);
      Object.assign(contract, data);
      return { ...contract };
    },
  },
  reservation: { findFirst: async () => null },
  vehicle: { findUnique: async ({ where }) => (where.id === SOLD_CAR.id ? { ...SOLD_CAR } : null) },
};

const inject = (relative, exports) => {
  const file = path.resolve(__dirname, relative);
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
inject("../../lib/prisma.js", fakePrisma);
// Financial recompute has its own tests; here it only has to be called.
let recomputed = 0;
inject("./contract-financials.js", {
  recomputeContractFinancials: async () => {
    recomputed += 1;
  },
  contractUnitPrice: () => 0,
});

const { updateContract } = require("./contracts.controller");

const ADMIN = { id: "admin-1", firstName: "Ali", lastName: "Koç", roles: ["Administrator"] };

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
    handler({ params: {}, query: {}, body: {}, user: ADMIN, ...req }, res, (err) => (err ? reject(err) : resolve(undefined)));
  });

// What the screen sends on "Kaydet": the unchanged car and dates plus the form.
const saveForm = (body) =>
  call(updateContract, {
    query: { carId: SOLD_CAR.id, contractId: contract.id },
    body: {
      pickUpTime: PICK_UP,
      dropOffTime: DROP_OFF,
      pickUpLocation: "Aliağa",
      dropOffLocation: "Aliağa",
      ...body,
    },
  });

for (const status of ["DONE", "CANCELLED"]) {
  test(`a ${status} contract whose car was sold still saves a new admin note`, async () => {
    resetDb(status);
    const { status: code, body } = await saveForm({ adminNote: "Müşteri iade sonrası çizik bildirdi." });
    assert.equal(code, 200);
    assert.equal(body.adminNote, "Müşteri iade sonrası çizik bildirdi.");
    assert.equal(body.adminNoteBy, "Ali K.");
    assert.ok(body.adminNoteAt instanceof Date);
    // The lifecycle status is never touched by a form save.
    assert.equal(contract.status, status);
    assert.equal(updates.length, 1);
    assert.ok(!("status" in updates[0]));
  });
}

test("saving the same note again keeps the original stamp", async () => {
  resetDb();
  await saveForm({ adminNote: "İlk not" });
  const firstStamp = contract.adminNoteAt;
  await saveForm({ adminNote: "İlk not" });
  assert.equal(contract.adminNoteAt, firstStamp);
});

test("clearing the note clears its stamp", async () => {
  resetDb();
  await saveForm({ adminNote: "Geçici not" });
  await saveForm({ adminNote: "" });
  assert.equal(contract.adminNote, null);
  assert.equal(contract.adminNoteAt, null);
  assert.equal(contract.adminNoteBy, null);
});

test("changing the dates still runs the availability check (sold car -> 409)", async () => {
  resetDb();
  await assert.rejects(
    () => saveForm({ dropOffTime: "11/06/2026 10:00:00", adminNote: "Uzatma" }),
    (err) => err.status === 409 || err.statusCode === 409
  );
  assert.equal(updates.length, 0, "nothing may be written when the check fails");
});

test("an invalid date range is still rejected", async () => {
  resetDb();
  await assert.rejects(
    () => saveForm({ dropOffTime: "10/30/2026 10:00:00" }),
    (err) => err.status === 400 || err.statusCode === 400
  );
});

test("every successful save recomputes the contract financials", async () => {
  resetDb();
  const before = recomputed;
  await saveForm({ adminNote: "Tahsilat sözü 15 Kasım" });
  assert.equal(recomputed, before + 1);
});
