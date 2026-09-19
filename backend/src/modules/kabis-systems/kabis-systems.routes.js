const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const { getKabisSystems, createKabisSystem, deleteKabisSystem } = require("./kabis-systems.controller");

const router = Router();

router.get("/kabis-systems/admin/auth", authenticate, requireAdmin, getKabisSystems);
router.post("/kabis-systems/admin/auth", authenticate, requireAdmin, createKabisSystem);
router.delete("/kabis-systems/admin/:id/auth", authenticate, requireAdmin, deleteKabisSystem);

module.exports = router;
