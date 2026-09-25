// Display name stamped on a KABİS filing / release action: "Ali K." style.
const kbsStamp = (user) => {
  const last = (user.lastName || "").trim();
  return `${user.firstName || ""}${last ? ` ${last.charAt(0)}.` : ""}`.trim() || null;
};

// A rental that was filed in KABİS but not yet released — closing no longer
// requires this (see returnContract), but it's still what the release-at-
// close checkbox and the dashboard's KABİS-pending panel key off of.
const kbsNeedsRelease = (contract) => !!contract.kbsNotifiedAt && !contract.kbsReleasedAt;

module.exports = { kbsStamp, kbsNeedsRelease };
