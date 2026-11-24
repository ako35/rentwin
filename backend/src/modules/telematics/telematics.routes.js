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
  handleTick,
  listAlerts,
  acknowledgeAlerts,
  getVehicleKm,
  calibrateVehicleKm,
  getGpsStatus,
  sendTestEmail,
} = require("./telematics.controller");

const router = Router();

const ID = "([0-9a-fA-F-]{36})";

// Traccar -> Rentwin event forwarding. Secret-gated inside the handler.
router.post("/telematics/webhook", handleWebhook);
// Periodic check (Faz 3): a timer on the GPS server POSTs here every 5
// minutes; GET is for Vercel Cron. Secret-gated inside the handler.
router.post("/telematics/tick", handleTick);
router.get("/telematics/tick", handleTick);

router.get("/telematics/admin/fleet/auth", authenticate, requireAdmin, getFleet);
router.get("/telematics/admin/access-logs/auth", authenticate, requireAdmin, listAccessLogs);
router.get("/telematics/admin/alerts/auth", authenticate, requireAdmin, listAlerts);
router.post("/telematics/admin/alerts/ack/auth", authenticate, requireAdmin, acknowledgeAlerts);
router.get("/telematics/admin/status/auth", authenticate, requireAdmin, getGpsStatus);
router.post("/telematics/admin/test-email/auth", authenticate, requireAdmin, sendTestEmail);
router.get(`/telematics/admin/vehicles/:id${ID}/km/auth`, authenticate, requireAdmin, getVehicleKm);
router.post(`/telematics/admin/vehicles/:id${ID}/km/auth`, authenticate, requireAdmin, calibrateVehicleKm);
router.get(`/telematics/admin/vehicles/:id${ID}/auth`, authenticate, requireAdmin, getVehicleTelematics);
router.put(`/telematics/admin/vehicles/:id${ID}/tracker/auth`, authenticate, requireAdmin, setTracker);
router.post(`/telematics/admin/vehicles/:id${ID}/access/auth`, authenticate, requireAdmin, grantLiveAccess);
// POST, not GET: reading a route writes an access-log row and carries the
// reason in the body.
router.post(`/telematics/admin/vehicles/:id${ID}/route/auth`, authenticate, requireAdmin, getVehicleRoute);
router.post(`/telematics/admin/contracts/:id${ID}/route/auth`, authenticate, requireAdmin, getContractRoute);

module.exports = router;
