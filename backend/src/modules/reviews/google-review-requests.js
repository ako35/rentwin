// "Google Yorumu İste" list (/admin/reviews/google): every customer with at
// least one returned (DONE) contract, so the admin can send each of them the
// pre-typed WhatsApp review request once. Google ranks the Maps listing on
// review count and recency, and past customers are the only legitimate source
// — staff accounts are left out on purpose (Google removes reviews from
// people connected to the business).

const isStaff = (user) => Array.isArray(user.roles) && user.roles.includes("Administrator");

// Display name the admin recognises: company title, else "First Last".
const customerName = (user) =>
  (user.companyTitle || `${user.firstName || ""} ${user.lastName || ""}`).replace(/\s+/g, " ").trim();

// users: [{ id, firstName, lastName, companyTitle, phoneNumber, roles,
//           googleReviewRequestedAt, contracts: [{ returnedAt, dropOffTime }] }]
// (contracts already filtered to DONE). Newest return first — a customer who
// returned the car yesterday remembers the rental best.
const summarizeGoogleReviewCandidates = (users) => {
  const rows = users
    .filter((user) => !isStaff(user) && user.contracts.length > 0)
    .map((user) => {
      const lastReturnedAt = user.contracts
        .map((c) => c.returnedAt || c.dropOffTime)
        .filter(Boolean)
        .reduce((latest, d) => (!latest || new Date(d) > new Date(latest) ? d : latest), null);
      return {
        id: user.id,
        name: customerName(user),
        firstName: user.firstName || "",
        companyTitle: user.companyTitle || "",
        phoneNumber: user.phoneNumber || "",
        rentals: user.contracts.length,
        lastReturnedAt,
        requestedAt: user.googleReviewRequestedAt || null,
      };
    })
    .sort((a, b) => new Date(b.lastReturnedAt || 0) - new Date(a.lastReturnedAt || 0));

  return {
    pending: rows.filter((r) => !r.requestedAt),
    requested: rows
      .filter((r) => r.requestedAt)
      .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)),
  };
};

module.exports = { summarizeGoogleReviewCandidates };
