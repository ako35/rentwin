const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  listRecords,
  createRecord,
  updateRecord,
  deleteRecord,
} = require("./contract-records.controller");

const router = Router();

// :resource is one of drivers | payments | extras.
// 4-5 segment paths so they never collide with the 2-3 segment /contracts/admin/... routes.
router.get("/contracts/admin/:contractId/:resource/auth", authenticate, requireAdmin, listRecords);
router.post("/contracts/admin/:contractId/:resource/auth", authenticate, requireAdmin, createRecord);
router.put("/contracts/admin/:resource/:id/records/auth", authenticate, requireAdmin, updateRecord);
router.delete("/contracts/admin/:resource/:id/records/auth", authenticate, requireAdmin, deleteRecord);

module.exports = router;
