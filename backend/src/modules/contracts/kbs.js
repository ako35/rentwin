// Display name stamped on a KABİS filing / release action: "Ali K." style.
const kbsStamp = (user) => {
  const last = (user.lastName || "").trim();
  return `${user.firstName || ""}${last ? ` ${last.charAt(0)}.` : ""}`.trim() || null;
};

module.exports = { kbsStamp };
