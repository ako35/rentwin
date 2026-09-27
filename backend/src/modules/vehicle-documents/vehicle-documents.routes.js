const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const upload = require("../../middleware/upload");
const { listDocuments, uploadDocument, deleteDocument } = require("./vehicle-documents.controller");

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

module.exports = router;
