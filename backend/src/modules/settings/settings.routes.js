const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const { getSettings, updateSettings } = require("./settings.controller");

const router = Router();

router.get("/settings/admin/auth", authenticate, requireAdmin, getSettings);
router.put("/settings/admin/auth", authenticate, requireAdmin, updateSettings);

module.exports = router;
