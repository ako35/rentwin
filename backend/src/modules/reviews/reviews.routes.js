const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const { publicWriteLimiter } = require("../../middleware/rate-limit");
const {
  submitReview,
  getReviews,
  getReviewsByPageAdmin,
  approveReview,
  rejectReview,
  deleteReview,
} = require("./reviews.controller");

const router = Router();

router.post("/reviews/visitors", publicWriteLimiter, submitReview);
router.get("/reviews", getReviews);

router.get("/reviews/pages", authenticate, requireAdmin, getReviewsByPageAdmin);
router.post("/reviews/:id/approve", authenticate, requireAdmin, approveReview);
router.post("/reviews/:id/reject", authenticate, requireAdmin, rejectReview);
router.delete("/reviews/:id", authenticate, requireAdmin, deleteReview);

module.exports = router;
