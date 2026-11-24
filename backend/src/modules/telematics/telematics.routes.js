const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  getFleet,
  getVehicleTelematics,
  setTracker,
  grantLiveAccess,
  getVehicleRoute,
  getContractRoute,
  listAccessLogs,
  handleWebhook,
} = require("./telematics.controller");

const router = Router();

const ID = "([0-9a-fA-F-]{36})";

// Traccar -> Rentwin event forwarding. Secret-gated inside the handler.
router.post("/telematics/webhook", handleWebhook);

router.get("/telematics/admin/fleet/auth", authenticate, requireAdmin, getFleet);
router.get("/telematics/admin/access-logs/auth", authenticate, requireAdmin, listAccessLogs);
router.get(`/telematics/admin/vehicles/:id${ID}/auth`, authenticate, requireAdmin, getVehicleTelematics);
router.put(`/telematics/admin/vehicles/:id${ID}/tracker/auth`, authenticate, requireAdmin, setTracker);
router.post(`/telematics/admin/vehicles/:id${ID}/access/auth`, authenticate, requireAdmin, grantLiveAccess);
// POST, not GET: reading a route writes an access-log row and carries the
// reason in the body.
router.post(`/telematics/admin/vehicles/:id${ID}/route/auth`, authenticate, requireAdmin, getVehicleRoute);
router.post(`/telematics/admin/contracts/:id${ID}/route/auth`, authenticate, requireAdmin, getContractRoute);

module.exports = router;
