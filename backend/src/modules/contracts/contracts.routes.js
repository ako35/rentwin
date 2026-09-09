const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  getContractsByPage,
  createContract,
  getAvailableCarsAdmin,
  deleteContract,
  getAdminSchedule,
  getHgsPendingContracts,
  returnContract,
  cancelContract,
  reopenContract,
} = require("./contracts.admin.controller");
const {
  updateContract,
  getContractByIdAdmin,
  extendContract,
  deleteExtension,
  changeVehicle,
  listInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} = require("./contracts.controller");

const router = Router();

router.get("/contracts/admin/schedule/auth", authenticate, requireAdmin, getAdminSchedule);
router.get("/contracts/admin/hgs-pending/auth", authenticate, requireAdmin, getHgsPendingContracts);
router.get("/contracts/admin/all/auth", authenticate, requireAdmin, getContractsByPage);
router.get("/contracts/admin/available-cars/auth", authenticate, requireAdmin, getAvailableCarsAdmin);
router.get("/contracts/:id/admin", authenticate, requireAdmin, getContractByIdAdmin);

router.post("/contracts/admin/auth", authenticate, requireAdmin, createContract);
router.put("/contracts/admin/auth", authenticate, requireAdmin, updateContract);
router.delete("/contracts/admin/:id/auth", authenticate, requireAdmin, deleteContract);
router.post("/contracts/admin/:id/extend/auth", authenticate, requireAdmin, extendContract);
router.delete(
  "/contracts/admin/:id/extension/:extensionId/auth",
  authenticate,
  requireAdmin,
  deleteExtension
);
router.post("/contracts/admin/:id/change-vehicle/auth", authenticate, requireAdmin, changeVehicle);
router.get("/contracts/admin/:id/invoices/auth", authenticate, requireAdmin, listInvoices);
router.post("/contracts/admin/:id/invoice/auth", authenticate, requireAdmin, createInvoice);
router.put("/contracts/admin/invoices/:invoiceId/auth", authenticate, requireAdmin, updateInvoice);
router.delete("/contracts/admin/invoices/:invoiceId/auth", authenticate, requireAdmin, deleteInvoice);
router.post("/contracts/admin/:id/return/auth", authenticate, requireAdmin, returnContract);
router.post("/contracts/admin/:id/cancel/auth", authenticate, requireAdmin, cancelContract);
router.post("/contracts/admin/:id/reopen/auth", authenticate, requireAdmin, reopenContract);

module.exports = router;
