const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  listRecords,
  createRecord,
  updateRecord,
  deleteRecord,
} = require("./reservation-records.controller");

const router = Router();

// :resource is one of drivers | payments.
// 4-5 segment paths so they never collide with the 2-3 segment /reservations/admin/... routes.
router.get("/reservations/admin/:reservationId/:resource/auth", authenticate, requireAdmin, listRecords);
router.post("/reservations/admin/:reservationId/:resource/auth", authenticate, requireAdmin, createRecord);
router.put("/reservations/admin/:resource/:id/records/auth", authenticate, requireAdmin, updateRecord);
router.delete("/reservations/admin/:resource/:id/records/auth", authenticate, requireAdmin, deleteRecord);

module.exports = router;
