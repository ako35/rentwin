const express = require("express");
const { notifyRentalStart, notifyRentalEnd, KabisNotImplementedError } = require("../kabis-client");

const router = express.Router();

const REQUIRED_START_FIELDS = ["contractRef", "kabisSystem", "renter", "vehicle", "rentalStart"];

router.post("/kabis/notify", async (req, res, next) => {
  const missing = REQUIRED_START_FIELDS.filter((f) => !req.body?.[f]);
  if (missing.length) {
    return res.status(400).json({ error: `Eksik alan(lar): ${missing.join(", ")}` });
  }

  try {
    const result = await notifyRentalStart(req.body);
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

router.post("/kabis/release", async (req, res, next) => {
  if (!req.body?.contractRef || !req.body?.kabisSystem) {
    return res.status(400).json({ error: "contractRef ve kabisSystem zorunludur." });
  }

  try {
    const result = await notifyRentalEnd(req.body);
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

// KabisNotImplementedError -> 501, düz metin değil JSON ile — çağıran taraf
// (Rentwin backend) bunu "gerçek entegrasyon henüz yok" olarak ayırt edip
// kullanıcıya net bir mesaj gösterebilsin diye.
// eslint-disable-next-line no-unused-vars
const kabisErrorHandler = (err, req, res, next) => {
  if (err instanceof KabisNotImplementedError) {
    return res.status(err.statusCode).json({ error: err.message, code: "KABIS_NOT_IMPLEMENTED" });
  }
  res.status(500).json({ error: "KABİS proxy hatası.", detail: err.message });
};

module.exports = { router, kabisErrorHandler };
