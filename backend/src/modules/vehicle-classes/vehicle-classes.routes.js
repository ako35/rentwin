const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  getAllVehicleClasses,
  createVehicleClass,
  updateVehicleClass,
  deleteVehicleClass,
} = require("./vehicle-classes.controller");

const router = Router();

router.get("/vehicle-classes/admin/auth", authenticate, requireAdmin, getAllVehicleClasses);
router.post("/vehicle-classes/admin/auth", authenticate, requireAdmin, createVehicleClass);
router.put("/vehicle-classes/admin/:id/auth", authenticate, requireAdmin, updateVehicleClass);
router.delete("/vehicle-classes/admin/:id/auth", authenticate, requireAdmin, deleteVehicleClass);

module.exports = router;
