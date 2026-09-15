const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { extractVehicleRegistration, extractVehicleInsurance } = require("../../lib/gemini");

// "Ruhsattan Doldur": admin uploads a photo of the registration certificate,
// Gemini reads it and returns the fields as a prefill payload — nothing is
// persisted here, the frontend just drops the result into the vehicle form.
const extractRegistration = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Görsel yüklenmedi.");

  let fields;
  try {
    fields = await extractVehicleRegistration(req.file.buffer, req.file.mimetype);
  } catch (error) {
    if (error.code === "AI_QUOTA") throw new HttpError(429, error.message, "AI_QUOTA");
    throw new HttpError(502, error.message);
  }

  if (!fields.documentDetected) {
    throw new HttpError(422, "Görsel bir ruhsat belgesine benzemiyor.");
  }

  delete fields.documentDetected;
  res.json(fields);
});

// "Poliçeden Doldur": same pattern, for the Sigorta/Kasko tab's add-record
// form — reads a trafik sigortası / kasko poliçesi photo or PDF into
// {type, company, policyNo, startDate, endDate, premium}.
const extractInsurance = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Görsel yüklenmedi.");

  let fields;
  try {
    fields = await extractVehicleInsurance(req.file.buffer, req.file.mimetype);
  } catch (error) {
    if (error.code === "AI_QUOTA") throw new HttpError(429, error.message, "AI_QUOTA");
    throw new HttpError(502, error.message);
  }

  if (!fields.documentDetected) {
    throw new HttpError(422, "Görsel bir sigorta/kasko poliçesine benzemiyor.");
  }

  delete fields.documentDetected;
  res.json(fields);
});

module.exports = { extractRegistration, extractInsurance };
