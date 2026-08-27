const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require("./announcements.controller");

const router = Router();

router.get("/announcements/admin/active/auth", authenticate, requireAdmin, getActiveAnnouncements);
router.get("/announcements/admin/auth", authenticate, requireAdmin, getAllAnnouncements);
router.post("/announcements/admin/auth", authenticate, requireAdmin, createAnnouncement);
router.put("/announcements/admin/:id/auth", authenticate, requireAdmin, updateAnnouncement);
router.delete("/announcements/admin/:id/auth", authenticate, requireAdmin, deleteAnnouncement);

module.exports = router;
