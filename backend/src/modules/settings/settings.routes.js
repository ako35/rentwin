const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const { getSettings, updateSettings, getAiUsage } = require("./settings.controller");

const router = Router();

router.get("/settings/admin/auth", authenticate, requireAdmin, getSettings);
router.put("/settings/admin/auth", authenticate, requireAdmin, updateSettings);
router.get("/settings/ai-usage/auth", authenticate, requireAdmin, getAiUsage);

module.exports = router;
