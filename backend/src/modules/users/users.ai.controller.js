const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { extractCustomerDocument } = require("../../lib/gemini");

// "Belgeden Doldur": admin uploads a photo of a customer document — a driving
// licence / ID for an individual, a company stamp / tax registration for a
// corporate customer — Gemini reads it and returns the fields as a prefill
// payload. Nothing is persisted; the frontend drops the result into the form.
const extractDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Görsel yüklenmedi.");
  const kind = req.body.kind === "corporate" ? "corporate" : "individual";

  let fields;
  try {
    fields = await extractCustomerDocument(req.file.buffer, req.file.mimetype, kind);
  } catch (error) {
    if (error.code === "AI_QUOTA") throw new HttpError(429, error.message, "AI_QUOTA");
    throw new HttpError(502, error.message);
  }

  if (!fields.documentDetected) {
    throw new HttpError(
      422,
      kind === "corporate"
        ? "Görsel bir kaşe / vergi levhası belgesine benzemiyor."
        : "Görsel bir ehliyet / kimlik belgesine benzemiyor."
    );
  }

  delete fields.documentDetected;
  res.json(fields);
});

module.exports = { extractDocument };
