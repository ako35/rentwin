const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const { getFieldSchedule, getFieldContract, saveFieldReadings } = require("./field.controller");

const router = Router();

// Rentwin Saha mobile app. Photo upload/list stay on contract-photos routes.
router.get("/field/schedule/auth", authenticate, requireAdmin, getFieldSchedule);
router.get("/field/contracts/:id/auth", authenticate, requireAdmin, getFieldContract);
router.put("/field/contracts/:id/readings/auth", authenticate, requireAdmin, saveFieldReadings);

module.exports = router;
