const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const { downloadUsers, downloadCars, downloadReservations } = require("./excel.controller");

const router = Router();

router.get("/excel/download/users", authenticate, requireAdmin, downloadUsers);
router.get("/excel/download/cars", authenticate, requireAdmin, downloadCars);
router.get("/excel/download/reservations", authenticate, requireAdmin, downloadReservations);

module.exports = router;
