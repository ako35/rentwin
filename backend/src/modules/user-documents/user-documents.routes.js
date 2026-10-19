const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const upload = require("../../middleware/upload");
const { listDocuments, uploadDocument, deleteDocument } = require("./user-documents.controller");

const router = Router();

router.get("/user/:userId/documents/auth", authenticate, requireAdmin, listDocuments);
router.post(
  "/user/:userId/documents/auth",
  authenticate,
  requireAdmin,
  upload.single("file"),
  uploadDocument
);
router.delete("/user/documents/:id/auth", authenticate, requireAdmin, deleteDocument);

module.exports = router;
