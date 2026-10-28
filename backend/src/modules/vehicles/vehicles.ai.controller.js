const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { researchVehiclePrice } = require("../../lib/claude");

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

module.exports = { researchPrice };
