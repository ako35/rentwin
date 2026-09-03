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
  createReservationAdmin,
  getAvailableCarsAdmin,
  deleteReservationAdmin,
  updateReservationAdmin,
  getReservationByIdAdmin,
  extendReservation,
  createInvoice,
  getAdminSchedule,
} = require("./reservations.admin.controller");

const router = Router();

router.post("/reservations/add", authenticate, createReservation);
router.get("/reservations/auth/all", authenticate, getMyReservationsByPage);
router.get("/reservations/auth", authenticate, checkVehicleAvailability);
router.get("/reservations/admin/schedule/auth", authenticate, requireAdmin, getAdminSchedule);
router.get("/reservations/admin/all/auth", authenticate, requireAdmin, getReservationsByPageAdmin);
router.get("/reservations/admin/available-cars/auth", authenticate, requireAdmin, getAvailableCarsAdmin);
router.get("/reservations/:id/auth", authenticate, getReservationById);
router.get("/reservations/:id/admin", authenticate, requireAdmin, getReservationByIdAdmin);

router.post("/reservations/admin/auth", authenticate, requireAdmin, createReservationAdmin);
router.delete("/reservations/admin/:id/auth", authenticate, requireAdmin, deleteReservationAdmin);
router.put("/reservations/admin/auth", authenticate, requireAdmin, updateReservationAdmin);
router.post("/reservations/admin/:id/extend/auth", authenticate, requireAdmin, extendReservation);
router.post("/reservations/admin/:id/invoice/auth", authenticate, requireAdmin, createInvoice);

module.exports = router;
