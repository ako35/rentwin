const multer = require("multer");

// 10 MB ceiling — the client downscales photos before upload, but leave headroom
// for a scanned PDF. Note the platform request-body cap (~4.5 MB on Vercel) is
// the real limit in production.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;
