const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  createReservation,
  getReservationById,
  getMyReservationsByPage,
  checkVehicleAvailability,
  deleteReservationAdmin,
  updateReservationAdmin,
  getReservationByIdAdmin,
} = require("./reservations.controller");

const router = Router();

router.post("/reservations/add", authenticate, createReservation);
router.get("/reservations/auth/all", authenticate, getMyReservationsByPage);
router.get("/reservations/auth", authenticate, checkVehicleAvailability);
router.get("/reservations/:id/auth", authenticate, getReservationById);
router.get("/reservations/:id/admin", authenticate, requireAdmin, getReservationByIdAdmin);

router.delete("/reservations/admin/:id/auth", authenticate, requireAdmin, deleteReservationAdmin);
router.put("/reservations/admin/auth", authenticate, requireAdmin, updateReservationAdmin);

module.exports = router;
