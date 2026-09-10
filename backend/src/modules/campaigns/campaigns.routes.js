const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  getPublicCampaigns,
  getAllCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} = require("./campaigns.controller");

const router = Router();

router.get("/campaigns", getPublicCampaigns);
router.get("/campaigns/admin/auth", authenticate, requireAdmin, getAllCampaigns);
router.post("/campaigns/admin/auth", authenticate, requireAdmin, createCampaign);
router.put("/campaigns/admin/:id/auth", authenticate, requireAdmin, updateCampaign);
router.delete("/campaigns/admin/:id/auth", authenticate, requireAdmin, deleteCampaign);

module.exports = router;
