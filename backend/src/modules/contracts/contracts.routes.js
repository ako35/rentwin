const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  getContractsByPage,
  createContract,
  getAvailableCarsAdmin,
  deleteContract,
  getAdminSchedule,
  returnContract,
  cancelContract,
  reopenContract,
} = require("./contracts.admin.controller");
const {
  updateContract,
  getContractByIdAdmin,
  extendContract,
  changeVehicle,
  createInvoice,
} = require("./contracts.controller");

const router = Router();

router.get("/contracts/admin/schedule/auth", authenticate, requireAdmin, getAdminSchedule);
router.get("/contracts/admin/all/auth", authenticate, requireAdmin, getContractsByPage);
router.get("/contracts/admin/available-cars/auth", authenticate, requireAdmin, getAvailableCarsAdmin);
router.get("/contracts/:id/admin", authenticate, requireAdmin, getContractByIdAdmin);

router.post("/contracts/admin/auth", authenticate, requireAdmin, createContract);
router.put("/contracts/admin/auth", authenticate, requireAdmin, updateContract);
router.delete("/contracts/admin/:id/auth", authenticate, requireAdmin, deleteContract);
router.post("/contracts/admin/:id/extend/auth", authenticate, requireAdmin, extendContract);
router.post("/contracts/admin/:id/change-vehicle/auth", authenticate, requireAdmin, changeVehicle);
router.post("/contracts/admin/:id/invoice/auth", authenticate, requireAdmin, createInvoice);
router.post("/contracts/admin/:id/return/auth", authenticate, requireAdmin, returnContract);
router.post("/contracts/admin/:id/cancel/auth", authenticate, requireAdmin, cancelContract);
router.post("/contracts/admin/:id/reopen/auth", authenticate, requireAdmin, reopenContract);

module.exports = router;
