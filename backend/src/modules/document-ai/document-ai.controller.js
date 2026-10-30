const HttpError = require("../../lib/http-error");
const { extractDocumentWithGemini } = require("../../lib/gemini-document-extraction");
const asyncHandler = require("../../middleware/async-handler");

const MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const STATUS_BY_CODE = {
  AI_CONFIG: 503,
  AI_BILLING: 402,
  AI_MODEL: 502,
  AI_FILE: 413,
  AI_QUOTA: 429,
  AI_TIMEOUT: 504,
  AI_PROVIDER: 502,
  AI_REQUEST: 400,
  AI_RESPONSE: 502,
};

const extractFor = (resolveKind) =>
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Belge dosyası yüklenmedi.", "AI_FILE");

    const kind = resolveKind(req);
    if (!kind || !["registration", "insurance", "inspection", "individual", "corporate", "invoice"].includes(kind)) {
      throw new HttpError(400, "Desteklenmeyen belge türü.", "AI_REQUEST");
    }
    if (!MIME_TYPES.has(req.file.mimetype)) {
      throw new HttpError(415, "PDF, JPG veya PNG biçiminde belge yükleyin.", "AI_FILE");
    }

    let fields;
    try {
      fields = await extractDocumentWithGemini({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        kind,
      });
    } catch (error) {
      const code = error.code || "AI_PROVIDER";
      console.error("[document extract]", {
        kind,
        code,
        upstreamStatus: error.upstreamStatus || null,
      });
      throw new HttpError(STATUS_BY_CODE[code] || 502, error.message, code);
    }

    if (!fields.documentDetected) {
      throw new HttpError(422, "Yüklenen dosya beklenen belge türü olarak tanınmadı.", "DOCUMENT_NOT_DETECTED");
    }

    res.json(fields);
  });

const extractRegistration = extractFor(() => "registration");
const extractInsurance = extractFor(() => "insurance");
const extractInspection = extractFor(() => "inspection");
const extractInvoice = extractFor(() => "invoice");
const extractCustomerDocument = extractFor((req) => req.body?.kind);

module.exports = {
  extractRegistration,
  extractInsurance,
  extractInspection,
  extractInvoice,
  extractCustomerDocument,
};
