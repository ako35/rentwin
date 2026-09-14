// Shared between reviews.controller.js (public/admin CRUD) and
// prerender.controller.js (bot SEO head) so both read the exact same shape
// off the same query — they must never drift from each other.

const REVIEW_NAME_MAX = 60;
const REVIEW_BODY_MAX = 500;
const REVIEW_BODY_MIN = 10;

// KVKK-friendly public display: "Ayşe Yılmaz" -> "Ayşe Y." Only ever applied
// to PUBLIC reads (getReviews, prerender's loadReviewSeoData). The admin
// moderation queue (getReviewsByPageAdmin) returns the raw name.
const maskName = (name) => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || "";
  const last = parts[parts.length - 1];
  return `${parts.slice(0, -1).join(" ")} ${last[0]}.`;
};

const round1 = (n) => Math.round(n * 10) / 10;

// GET /reviews and the bot-prerender's "/" and "/yorumlar" branches both
// call this — same query, same shape, so the two never drift.
const loadReviewSeoData = async (prisma, take = 10) => {
  const [agg, latest] = await Promise.all([
    prisma.review.aggregate({ where: { status: "APPROVED" }, _avg: { rating: true }, _count: true }),
    prisma.review.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, name: true, rating: true, body: true, createdAt: true },
    }),
  ]);
  return {
    reviewSummary: agg._count > 0 ? { count: agg._count, average: round1(agg._avg.rating || 0) } : null,
    reviews: latest.map((r) => ({ ...r, name: maskName(r.name) })),
  };
};

module.exports = { REVIEW_NAME_MAX, REVIEW_BODY_MAX, REVIEW_BODY_MIN, maskName, round1, loadReviewSeoData };
