const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const {
  REVIEW_NAME_MAX,
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  maskName,
  round1,
} = require("./reviews.shared");

const ALLOWED_SORT_FIELDS = ["id", "createdAt", "rating", "status"];
const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

// Public — the form on /yorumlar. `company` is a honeypot: real visitors
// never see or fill it (off-screen + tabIndex={-1} on the frontend). A bot
// that blindly fills every input trips it; we respond with an identical 201
// so it has no signal to adjust, but never touch the DB.
const submitReview = asyncHandler(async (req, res) => {
  const { name, rating, body, company } = req.body;

  if (company) {
    return res.status(201).json({ id: "ok", status: "PENDING" });
  }

  if (!name || !String(name).trim()) throw new HttpError(400, "Missing required fields.");
  if (!body || !String(body).trim()) throw new HttpError(400, "Missing required fields.");

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw new HttpError(400, "Rating must be an integer between 1 and 5.");
  }

  const trimmedName = String(name).trim().slice(0, REVIEW_NAME_MAX);
  const trimmedBody = String(body).trim().slice(0, REVIEW_BODY_MAX);
  if (trimmedBody.length < REVIEW_BODY_MIN) throw new HttpError(400, "Review is too short.");

  const review = await prisma.review.create({
    data: { name: trimmedName, rating: ratingNum, body: trimmedBody },
  });
  res.status(201).json({ id: review.id, status: review.status });
});

// Public — /yorumlar page + homepage teaser. ?limit=N caps the list.
const getReviews = asyncHandler(async (req, res) => {
  const requested = parseInt(req.query.limit, 10);
  const take = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 200) : 200;

  const [items, agg] = await Promise.all([
    prisma.review.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, name: true, rating: true, body: true, createdAt: true },
    }),
    prisma.review.aggregate({ where: { status: "APPROVED" }, _avg: { rating: true }, _count: true }),
  ]);

  res.json({
    items: items.map((r) => ({ ...r, name: maskName(r.name) })),
    count: agg._count,
    average: agg._count > 0 ? round1(agg._avg.rating || 0) : 0,
  });
});

// Admin — moderation queue, filterable by status.
const getReviewsByPageAdmin = asyncHandler(async (req, res) => {
  const { page, size, direction, sortField } = parsePageParams(req.query, {
    defaultSize: 20,
    allowedSortFields: ALLOWED_SORT_FIELDS,
    defaultSortField: "createdAt",
    defaultDirection: "DESC",
  });
  const status = STATUSES.includes(req.query.status) ? req.query.status : undefined;
  const where = status ? { status } : {};

  const [content, totalElements] = await Promise.all([
    prisma.review.findMany({ where, skip: page * size, take: size, orderBy: { [sortField]: direction } }),
    prisma.review.count({ where }),
  ]);
  res.json(buildPageResponse({ content, totalElements, page, size, sortField }));
});

const setStatus = (status) =>
  asyncHandler(async (req, res) => {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) throw new HttpError(404, "Review not found.");
    const updated = await prisma.review.update({
      where: { id: review.id },
      data: { status, moderatedAt: new Date() },
    });
    res.json(updated);
  });

const approveReview = setStatus("APPROVED");
const rejectReview = setStatus("REJECTED");

const deleteReview = asyncHandler(async (req, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!review) throw new HttpError(404, "Review not found.");
  await prisma.review.delete({ where: { id: review.id } });
  res.json({ message: "Review deleted." });
});

module.exports = {
  submitReview,
  getReviews,
  getReviewsByPageAdmin,
  approveReview,
  rejectReview,
  deleteReview,
};
