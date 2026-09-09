const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const upload = require("../../middleware/upload");
const {
  listModelImages,
  uploadModelImage,
  generateModelImage,
  deleteModelImage,
} = require("./vehicle-model-images.controller");

const router = Router();

router.get("/car/admin/model-images/auth", authenticate, requireAdmin, listModelImages);
router.put(
  "/car/admin/model-images/auth",
  authenticate,
  requireAdmin,
  upload.single("file"),
  uploadModelImage
);
router.post(
  "/car/admin/model-images/generate/auth",
  authenticate,
  requireAdmin,
  generateModelImage
);
router.delete("/car/admin/model-images/:id/auth", authenticate, requireAdmin, deleteModelImage);

module.exports = router;
