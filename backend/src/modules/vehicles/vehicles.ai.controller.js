const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { extractVehicleRegistration, generateVehicleImage } = require("../../lib/gemini");

// "Ruhsattan Doldur": admin uploads a photo of the registration certificate,
// Gemini reads it and returns the fields as a prefill payload — nothing is
// persisted here, the frontend just drops the result into the vehicle form.
const extractRegistration = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Görsel yüklenmedi.");

  let fields;
  try {
    fields = await extractVehicleRegistration(req.file.buffer, req.file.mimetype);
  } catch (error) {
    throw new HttpError(502, error.message);
  }

  if (!fields.documentDetected) {
    throw new HttpError(422, "Görsel bir ruhsat belgesine benzemiyor.");
  }

  delete fields.documentDetected;
  res.json(fields);
});

// "Yapay Zeka ile Görsel Oluştur": admin fills the identity fields, Gemini
// renders a studio catalog photo of that vehicle. Nothing is persisted — the
// image comes back as a data URL and the frontend feeds it into the normal
// upload path when the form is saved.
const generateImage = asyncHandler(async (req, res) => {
  const { brand, model, modelYear, color } = req.body || {};
  if (!brand || !model) throw new HttpError(400, "Marka ve model gerekli.");

  let image;
  try {
    image = await generateVehicleImage({ brand, model, modelYear, color });
  } catch (error) {
    if (error.code === "AI_IMAGE_QUOTA") throw new HttpError(429, error.message, "AI_IMAGE_QUOTA");
    throw new HttpError(502, error.message);
  }

  res.json({ dataUrl: `data:${image.mimeType};base64,${image.base64}` });
});

module.exports = { extractRegistration, generateImage };
