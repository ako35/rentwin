const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const upload = require("../../middleware/upload");
const { upload: uploadFile, remove, display } = require("./files.controller");

const router = Router();

router.post("/files/upload", authenticate, requireAdmin, upload.single("file"), uploadFile);
router.delete("/files/:id", authenticate, requireAdmin, remove);
router.get("/files/display/:id", display);

module.exports = router;
