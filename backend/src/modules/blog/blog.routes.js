const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  getPublicPosts,
  getPostBySlug,
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
} = require("./blog.controller");

const router = Router();

router.get("/blog", getPublicPosts);
router.get("/blog/admin/auth", authenticate, requireAdmin, getAllPosts);
router.post("/blog/admin/auth", authenticate, requireAdmin, createPost);
router.put("/blog/admin/:id/auth", authenticate, requireAdmin, updatePost);
router.delete("/blog/admin/:id/auth", authenticate, requireAdmin, deletePost);
// Must come after /blog/admin/* so "admin" is never swallowed as a :slug.
router.get("/blog/:slug", getPostBySlug);

module.exports = router;
