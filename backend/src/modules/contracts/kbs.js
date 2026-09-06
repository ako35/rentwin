// Display name stamped on a KABİS filing / release action: "Ali K." style.
const kbsStamp = (user) => {
  const last = (user.lastName || "").trim();
  return `${user.firstName || ""}${last ? ` ${last.charAt(0)}.` : ""}`.trim() || null;
};

// A rental that was filed in KABİS but not yet released cannot be closed —
// the vehicle hand-over must be preceded by a KABİS exit notification.
const kbsBlocksClose = (contract) => !!contract.kbsNotifiedAt && !contract.kbsReleasedAt;

module.exports = { kbsStamp, kbsBlocksClose };
