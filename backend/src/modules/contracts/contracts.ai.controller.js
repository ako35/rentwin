const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { extractInvoiceDocument } = require("../../lib/claude");

// "Faturadan Doldur": admin uploads a photo/PDF of the issued invoice, Claude
// reads it and returns {number, issuedAt, periodFrom, periodTo, grossAmount,
// customerTitle, taxNo} as a prefill payload for the Fatura tab's add/edit
// form — nothing is persisted here.
const extractInvoice = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Görsel yüklenmedi.");

  let fields;
  try {
    fields = await extractInvoiceDocument(req.file.buffer, req.file.mimetype);
  } catch (error) {
    const statusByCode = {
      AI_CONFIG: 503,
      AI_MODEL: 502,
      AI_FILE: 413,
      AI_QUOTA: 429,
      AI_TIMEOUT: 504,
      AI_PROVIDER: 502,
      AI_REQUEST: 422,
    };
    const code = statusByCode[error.code] ? error.code : "AI_PROVIDER";
    console.error("[invoice extract]", code, error.upstreamStatus || "", error.message);
    throw new HttpError(statusByCode[code], error.message, code);
  }

  if (!fields.documentDetected) {
    throw new HttpError(422, "Görsel bir fatura belgesine benzemiyor.");
  }

  delete fields.documentDetected;
  res.json(fields);
});

module.exports = { extractInvoice };
