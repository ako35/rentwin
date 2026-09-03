const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const {
  createReservation,
  getReservationById,
  getMyReservationsByPage,
  checkVehicleAvailability,
} = require("./reservations.controller");

const router = Router();

router.post("/reservations/add", authenticate, createReservation);
router.get("/reservations/auth/all", authenticate, getMyReservationsByPage);
router.get("/reservations/auth", authenticate, checkVehicleAvailability);
router.get("/reservations/:id/auth", authenticate, getReservationById);

module.exports = router;
