const test = require("node:test");
const assert = require("node:assert/strict");
const { kbsStamp, kbsSwapPending, kbsSwapUpdate } = require("./kbs");

const admin = { firstName: "Ali", lastName: "Kaya" };
const now = new Date("2026-11-17T12:00:00Z");
const open = { kbsOldReleasedAt: null, kbsOldReleasedBy: null, kbsNewNotifiedAt: null, kbsNewNotifiedBy: null };

test("stamps the acting admin as 'First L.'", () => {
  assert.equal(kbsStamp(admin), "Ali K.");
  assert.equal(kbsStamp({ firstName: "Ali", lastName: "" }), "Ali");
});

test("a fresh swap has both KABİS steps open", () => {
  assert.deepEqual(kbsSwapPending(open), { oldRelease: true, newFiling: true });
  assert.deepEqual(kbsSwapPending({ ...open, kbsOldReleasedAt: now }), { oldRelease: false, newFiling: true });
});

test("ticking a step stamps time and admin, leaving the other step alone", () => {
  assert.deepEqual(kbsSwapUpdate(open, { oldReleased: true }, admin, now), {
    kbsOldReleasedAt: now,
    kbsOldReleasedBy: "Ali K.",
  });
  assert.deepEqual(kbsSwapUpdate(open, { newNotified: true }, admin, now), {
    kbsNewNotifiedAt: now,
    kbsNewNotifiedBy: "Ali K.",
  });
});

test("ticking an already-done step keeps the original stamp", () => {
  const done = { ...open, kbsOldReleasedAt: new Date("2026-11-16T09:00:00Z"), kbsOldReleasedBy: "Ayşe Y." };
  assert.equal(kbsSwapUpdate(done, { oldReleased: true }, admin, now), null);
});

test("unticking clears the stamp", () => {
  const done = { ...open, kbsNewNotifiedAt: now, kbsNewNotifiedBy: "Ali K." };
  assert.deepEqual(kbsSwapUpdate(done, { newNotified: false }, admin, now), {
    kbsNewNotifiedAt: null,
    kbsNewNotifiedBy: null,
  });
});

test("an empty body changes nothing", () => {
  assert.equal(kbsSwapUpdate(open, {}, admin, now), null);
  assert.equal(kbsSwapUpdate(open, undefined, admin, now), null);
});
