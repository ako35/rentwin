const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");

const pickFields = (body) => ({
  name: typeof body.name === "string" ? body.name.trim() : body.name,
  brand: typeof body.brand === "string" ? body.brand.trim() : body.brand,
  model: typeof body.model === "string" ? body.model.trim() : body.model,
});

const getAllVehicleClasses = asyncHandler(async (req, res) => {
  const classes = await prisma.vehicleClass.findMany({
    orderBy: [{ brand: "asc" }, { model: "asc" }],
  });
  res.json(classes);
});

const createVehicleClass = asyncHandler(async (req, res) => {
  const { name, brand, model } = pickFields(req.body);
  if (!name || !brand || !model) {
    throw new HttpError(400, "Name, brand and model are required.");
  }

  const vehicleClass = await prisma.vehicleClass.create({ data: { name, brand, model } });
  res.status(201).json(vehicleClass);
});

const updateVehicleClass = asyncHandler(async (req, res) => {
  const target = await prisma.vehicleClass.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Vehicle class not found.");

  const { name, brand, model } = pickFields(req.body);
  if (!name || !brand || !model) {
    throw new HttpError(400, "Name, brand and model are required.");
  }

  const vehicleClass = await prisma.vehicleClass.update({
    where: { id: target.id },
    data: { name, brand, model },
  });
  res.json(vehicleClass);
});

const deleteVehicleClass = asyncHandler(async (req, res) => {
  const target = await prisma.vehicleClass.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Vehicle class not found.");
  if (target.builtIn) throw new HttpError(403, "This vehicle class cannot be deleted.");

  await prisma.vehicleClass.delete({ where: { id: target.id } });
  res.json({ message: "Vehicle class deleted." });
});

module.exports = {
  getAllVehicleClasses,
  createVehicleClass,
  updateVehicleClass,
  deleteVehicleClass,
};
