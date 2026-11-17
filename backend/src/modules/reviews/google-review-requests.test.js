const test = require("node:test");
const assert = require("node:assert/strict");
const { summarizeGoogleReviewCandidates } = require("./google-review-requests");

const day = (d) => new Date(Date.UTC(2026, 10, d, 12));
const user = (id, overrides = {}) => ({
  id,
  firstName: "AYŞE",
  lastName: "YILMAZ",
  companyTitle: null,
  phoneNumber: "05073503135",
  roles: ["Customer"],
  googleReviewRequestedAt: null,
  contracts: [{ returnedAt: day(1), dropOffTime: day(1) }],
  ...overrides,
});

test("lists customers who were not asked yet, latest return first", () => {
  const { pending, requested } = summarizeGoogleReviewCandidates([
    user("old", { contracts: [{ returnedAt: day(2), dropOffTime: day(2) }] }),
    user("new", { contracts: [{ returnedAt: day(10), dropOffTime: day(9) }] }),
  ]);
  assert.deepEqual(pending.map((r) => r.id), ["new", "old"]);
  assert.equal(requested.length, 0);
});

test("uses the latest of several returns and counts the rentals", () => {
  const { pending } = summarizeGoogleReviewCandidates([
    user("u", {
      contracts: [
        { returnedAt: day(3), dropOffTime: day(3) },
        { returnedAt: null, dropOffTime: day(8) },
        { returnedAt: day(5), dropOffTime: day(5) },
      ],
    }),
  ]);
  assert.equal(pending[0].rentals, 3);
  assert.deepEqual(pending[0].lastReturnedAt, day(8));
});

test("moves asked customers to the requested list, most recently asked first", () => {
  const { pending, requested } = summarizeGoogleReviewCandidates([
    user("a", { googleReviewRequestedAt: day(14) }),
    user("b", { googleReviewRequestedAt: day(16) }),
    user("c"),
  ]);
  assert.deepEqual(pending.map((r) => r.id), ["c"]);
  assert.deepEqual(requested.map((r) => r.id), ["b", "a"]);
});

test("leaves out staff accounts and customers without a returned rental", () => {
  const { pending } = summarizeGoogleReviewCandidates([
    user("staff", { roles: ["Customer", "Administrator"] }),
    user("none", { contracts: [] }),
    user("ok"),
  ]);
  assert.deepEqual(pending.map((r) => r.id), ["ok"]);
});

test("shows the company title for corporate customers", () => {
  const { pending } = summarizeGoogleReviewCandidates([
    user("corp", { companyTitle: "ABC LOJİSTİK A.Ş.", firstName: "MEHMET", lastName: "KAYA" }),
  ]);
  assert.equal(pending[0].name, "ABC LOJİSTİK A.Ş.");
  assert.equal(pending[0].firstName, "MEHMET");
});
