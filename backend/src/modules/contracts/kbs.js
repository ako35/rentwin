// Display name stamped on a KABİS filing / release action: "Ali K." style.
const kbsStamp = (user) => {
  const last = (user.lastName || "").trim();
  return `${user.firstName || ""}${last ? ` ${last.charAt(0)}.` : ""}`.trim() || null;
};

// A mid-contract vehicle swap needs two KABİS steps: release the previous
// car's record (çıkış) and file the new car (giriş). Which of them are still
// open for one ContractVehicleChange row.
const kbsSwapPending = (change) => ({
  oldRelease: !change.kbsOldReleasedAt,
  newFiling: !change.kbsNewNotifiedAt,
});

// PATCH body { oldReleased?: boolean, newNotified?: boolean } -> the Prisma
// update for that swap row. Only the keys present in the body change; a step
// is stamped (time + acting admin) on its open -> done transition and cleared
// when unticked. Returns null when the body changes nothing.
const kbsSwapUpdate = (existing, body, user, now = new Date()) => {
  const data = {};
  const step = (key, atField, byField) => {
    if (!(key in (body || {}))) return;
    const done = body[key] === true;
    if (done && !existing[atField]) {
      data[atField] = now;
      data[byField] = kbsStamp(user);
    } else if (!done && existing[atField]) {
      data[atField] = null;
      data[byField] = null;
    }
  };
  step("oldReleased", "kbsOldReleasedAt", "kbsOldReleasedBy");
  step("newNotified", "kbsNewNotifiedAt", "kbsNewNotifiedBy");
  return Object.keys(data).length ? data : null;
};

module.exports = { kbsStamp, kbsSwapPending, kbsSwapUpdate };
