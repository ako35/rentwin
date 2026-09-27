const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const upload = require("../../middleware/upload");
const {
  listDocuments,
  uploadDocument,
  deleteDocument,
  listRecordDocuments,
  uploadRecordDocument,
} = require("./vehicle-documents.controller");

const router = Router();

// Mounted before vehicle-records.routes.js's generic "/:vehicleId/:resource/auth"
// catch-all so the literal "documents" segment is matched here first.
router.get("/car/admin/:vehicleId/documents/auth", authenticate, requireAdmin, listDocuments);
router.post(
  "/car/admin/:vehicleId/documents/auth",
  authenticate,
  requireAdmin,
  upload.single("file"),
  uploadDocument
);
router.delete("/car/admin/documents/:id/auth", authenticate, requireAdmin, deleteDocument);

// Documents attached to one specific insurance/tax/maintenance/inspection
// record. :resource is one of insurances|taxes|maintenances|inspections — a
// 6-segment path, so it never collides with the 5-segment routes above/in
// vehicle-records.routes.js.
router.get(
  "/car/admin/:resource/:recordId/documents/auth",
  authenticate,
  requireAdmin,
  listRecordDocuments
);
router.post(
  "/car/admin/:resource/:recordId/documents/auth",
  authenticate,
  requireAdmin,
  upload.single("file"),
  uploadRecordDocument
);

module.exports = router;
