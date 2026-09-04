const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  createReservation,
  getReservationById,
  getMyReservationsByPage,
  checkVehicleAvailability,
} = require("./reservations.controller");
const {
  getReservationsByPageAdmin,
  getReservationByIdAdmin,
  createReservationAdmin,
  updateReservationAdmin,
  confirmReservation,
  cancelReservation,
  convertToContract,
  getReservationSchedule,
} = require("./reservations.admin.controller");

const router = Router();

// Public / customer
router.post("/reservations/add", authenticate, createReservation);
router.get("/reservations/auth/all", authenticate, getMyReservationsByPage);
router.get("/reservations/auth", authenticate, checkVehicleAvailability);

// Admin — literal segments before ":id"
router.get("/reservations/admin/all/auth", authenticate, requireAdmin, getReservationsByPageAdmin);
router.get("/reservations/admin/schedule/auth", authenticate, requireAdmin, getReservationSchedule);
router.post("/reservations/admin/auth", authenticate, requireAdmin, createReservationAdmin);
router.get("/reservations/admin/:id/auth", authenticate, requireAdmin, getReservationByIdAdmin);
router.put("/reservations/admin/:id/auth", authenticate, requireAdmin, updateReservationAdmin);
router.post("/reservations/admin/:id/confirm/auth", authenticate, requireAdmin, confirmReservation);
router.post("/reservations/admin/:id/cancel/auth", authenticate, requireAdmin, cancelReservation);
router.post("/reservations/admin/:id/convert/auth", authenticate, requireAdmin, convertToContract);

// Public — generic ":id" last
router.get("/reservations/:id/auth", authenticate, getReservationById);

module.exports = router;
