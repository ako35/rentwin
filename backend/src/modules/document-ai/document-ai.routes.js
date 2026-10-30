const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const upload = require("../../middleware/upload");
const {
  extractRegistration,
  extractInsurance,
  extractInspection,
  extractInvoice,
  extractCustomerDocument,
} = require("./document-ai.controller");

const router = Router();

router.post(
  "/car/admin/extract-registration/auth",
  authenticate,
  requireAdmin,
  upload.single("file"),
  extractRegistration
);
router.post(
  "/car/admin/extract-insurance/auth",
  authenticate,
  requireAdmin,
  upload.single("file"),
  extractInsurance
);
router.post(
  "/car/admin/extract-inspection/auth",
  authenticate,
  requireAdmin,
  upload.single("file"),
  extractInspection
);
router.post(
  "/user/auth/extract-document",
  authenticate,
  requireAdmin,
  upload.single("file"),
  extractCustomerDocument
);
router.post(
  "/contracts/admin/invoice/extract/auth",
  authenticate,
  requireAdmin,
  upload.single("file"),
  extractInvoice
);

module.exports = router;
