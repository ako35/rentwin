const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const upload = require("../../middleware/upload");
const {
  getVehicleById,
  getAllVehicles,
  getVehiclesByPage,
  getVehiclesByPageAdmin,
  addVehicle,
  updateVehicle,
  deleteVehicle,
} = require("./vehicles.controller");
const { getFleetStats, getExpiryAlerts } = require("./vehicles.dashboard.controller");
const { extractRegistration } = require("./vehicles.ai.controller");

const router = Router();

// Order matters: literal segments ("all", "pages") must be registered
// before the ":id" route, or they'd be swallowed as an id param.
router.get("/car/visitors/all", getAllVehicles);
router.get("/car/visitors/pages", getVehiclesByPage);
router.get("/car/visitors/:id", getVehicleById);

router.get("/car/admin/pages/auth", authenticate, requireAdmin, getVehiclesByPageAdmin);
router.get("/car/admin/fleet-stats/auth", authenticate, requireAdmin, getFleetStats);
router.get("/car/admin/expiry-alerts/auth", authenticate, requireAdmin, getExpiryAlerts);
router.post(
  "/car/admin/extract-registration/auth",
  authenticate,
  requireAdmin,
  upload.single("file"),
  extractRegistration
);
router.post("/car/admin/:imageId/add", authenticate, requireAdmin, addVehicle);
router.put("/car/admin/auth", authenticate, requireAdmin, updateVehicle);
router.delete("/car/admin/:id/auth", authenticate, requireAdmin, deleteVehicle);

module.exports = router;
