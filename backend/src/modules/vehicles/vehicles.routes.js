const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const upload = require("../../middleware/upload");
const {
  getVehicleById,
  getVehicleByIdAdmin,
  getAllVehicles,
  getVehiclesByPage,
  getVehiclesByPageAdmin,
  addVehicle,
  updateVehicle,
  markVehicleSold,
  unmarkVehicleSold,
  deleteVehicle,
} = require("./vehicles.controller");
const { getFleetStats, getExpiryAlerts } = require("./vehicles.dashboard.controller");
const { extractRegistration } = require("./vehicles.ai.controller");

const router = Router();

// Vehicle ids are UUIDs. Constraining the ":id" param to that shape keeps these
// routes from swallowing sibling literal paths under /car/admin/* that live in
// other modules (e.g. /car/admin/model-images/auth in vehicle-model-images) —
// registration order across api.use() can't be relied on for that.
const ID = "([0-9a-fA-F-]{36})";

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
router.get(`/car/admin/:id${ID}/auth`, authenticate, requireAdmin, getVehicleByIdAdmin);
router.post("/car/admin/add", authenticate, requireAdmin, addVehicle);
router.put("/car/admin/auth", authenticate, requireAdmin, updateVehicle);
router.post(`/car/admin/:id${ID}/sold/auth`, authenticate, requireAdmin, markVehicleSold);
router.delete(`/car/admin/:id${ID}/sold/auth`, authenticate, requireAdmin, unmarkVehicleSold);
router.delete(`/car/admin/:id${ID}/auth`, authenticate, requireAdmin, deleteVehicle);

module.exports = router;
