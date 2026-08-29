const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  listRecords,
  createRecord,
  updateRecord,
  deleteRecord,
} = require("./vehicle-records.controller");

const router = Router();

// :resource is one of insurances | taxes | maintenances | inspections.
// All paths carry 4 segments so they never collide with the 3-segment
// /car/admin/... routes in vehicles.routes.js (updateVehicle, deleteVehicle, add).
router.get("/car/admin/:vehicleId/:resource/auth", authenticate, requireAdmin, listRecords);
router.post("/car/admin/:vehicleId/:resource/auth", authenticate, requireAdmin, createRecord);
router.put("/car/admin/:resource/:id/auth", authenticate, requireAdmin, updateRecord);
router.delete("/car/admin/:resource/:id/auth", authenticate, requireAdmin, deleteRecord);

module.exports = router;
