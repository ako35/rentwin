const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} = require("./locations.controller");

const router = Router();

router.get("/locations", getLocations);
router.post("/locations/admin/auth", authenticate, requireAdmin, createLocation);
router.put("/locations/admin/:id/auth", authenticate, requireAdmin, updateLocation);
router.delete("/locations/admin/:id/auth", authenticate, requireAdmin, deleteLocation);

module.exports = router;
