const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const { listExtras, createExtra, updateExtra, deleteExtra } = require("./extras.controller");

const router = Router();

router.get("/extras/admin/auth", authenticate, requireAdmin, listExtras);
router.post("/extras/admin/auth", authenticate, requireAdmin, createExtra);
router.put("/extras/admin/:id/auth", authenticate, requireAdmin, updateExtra);
router.delete("/extras/admin/:id/auth", authenticate, requireAdmin, deleteExtra);

module.exports = router;
