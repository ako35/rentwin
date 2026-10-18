const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const {
  extractVehicleRegistration,
  extractVehicleInsurance,
  extractVehicleInspection,
  researchVehiclePrice,
} = require("../../lib/claude");

// "Ruhsattan Doldur": admin uploads a photo of the registration certificate,
// Claude reads it and returns the fields as a prefill payload — nothing is
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
// form — Claude reads a trafik sigortası / kasko poliçesi photo or PDF into
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

// "Belgeden Doldur": same pattern, for the Muayene/Egzoz tab's add-record
// form — Claude reads a TÜVTÜRK araç muayene raporu / egzoz emisyon ölçüm
// belgesi photo or PDF into {type, date, result, expiryDate, station, cost}.
const extractInspection = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Görsel yüklenmedi.");

  let fields;
  try {
    fields = await extractVehicleInspection(req.file.buffer, req.file.mimetype);
  } catch (error) {
    if (error.code === "AI_QUOTA") throw new HttpError(429, error.message, "AI_QUOTA");
    throw new HttpError(502, error.message);
  }

  if (!fields.documentDetected) {
    throw new HttpError(422, "Görsel bir muayene/egzoz belgesine ya da ruhsata benzemiyor.");
  }

  delete fields.documentDetected;
  res.json(fields);
});

// Fiyat Listesi "Yapay Zeka ile Araştır": looks up the vehicle's own
// brand/model/year/transmission/fuelType, has Claude search the live web
// for competitor rental prices of that exact spec, and hands the
// suggestion back — nothing is saved here, the admin reviews it and
// applies it to the (still-manual) price-list save.
const researchPrice = asyncHandler(async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: req.params.id },
    select: { brand: true, model: true, modelYear: true, transmission: true, fuelType: true },
  });
  if (!vehicle) throw new HttpError(404, "Vehicle not found.");

  let result;
  try {
    result = await researchVehiclePrice(vehicle);
  } catch (error) {
    if (error.code === "AI_QUOTA") throw new HttpError(429, error.message, "AI_QUOTA");
    throw new HttpError(502, error.message);
  }

  res.json(result);
});

module.exports = { extractRegistration, extractInsurance, extractInspection, researchPrice };
