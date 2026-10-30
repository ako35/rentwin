const test = require("node:test");
const assert = require("node:assert/strict");
const { summarizeCustomerReturns } = require("./customer-score");

const date = (hour) => new Date(Date.UTC(2026, 0, 1, hour));
const contract = (status, dueHour, returnHour) => ({
  status,
  dropOffTime: date(dueHour),
  returnedAt: returnHour == null ? null : date(returnHour),
});

test("does not show a score before three completed rentals", () => {
  const result = summarizeCustomerReturns([
    contract("DONE", 10, 10),
    contract("DONE", 10, 12),
    contract("CREATED", 10, 10),
  ]);

  assert.equal(result.score, null);
  assert.equal(result.completedRentals, 2);
  assert.equal(result.lateReturns, 1);
});

test("counts only returns more than one hour late", () => {
  const result = summarizeCustomerReturns([
    contract("DONE", 10, 10),
    contract("DONE", 10, 11),
    contract("DONE", 10, 12),
    contract("CANCELLED", 10, 14),
  ]);

  assert.equal(result.score, 67);
  assert.equal(result.completedRentals, 3);
  assert.equal(result.onTimeReturns, 2);
  assert.equal(result.lateReturns, 1);
});

test("does not count completed contracts without an actual return", () => {
  const result = summarizeCustomerReturns([
    contract("DONE", 10, null),
    contract("DONE", 10, 10),
    contract("DONE", 10, 10),
  ]);

  assert.equal(result.score, null);
  assert.equal(result.completedRentals, 2);
});
