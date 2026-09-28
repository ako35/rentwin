const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const { requestUpload, confirmUpload, listPhotos, deletePhoto } = require("./contract-photos.controller");

const router = Router();

// Mobile app: ask for a presigned R2 PUT URL, then confirm once the direct
// upload succeeded. Web admin: list (gallery) + delete.
router.post("/contracts/admin/:id/photos/upload-url/auth", authenticate, requireAdmin, requestUpload);
router.post("/contracts/admin/:id/photos/auth", authenticate, requireAdmin, confirmUpload);
router.get("/contracts/admin/:id/photos/auth", authenticate, requireAdmin, listPhotos);
router.delete("/contracts/admin/photos/:id/auth", authenticate, requireAdmin, deletePhoto);

module.exports = router;
