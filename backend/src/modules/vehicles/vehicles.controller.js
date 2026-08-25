const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { serializeVehicle } = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");

const ALLOWED_SORT_FIELDS = ["id", "model", "pricePerHour", "age"];
const IMAGES_INCLUDE = { images: { orderBy: { createdAt: "asc" } } };

const VEHICLE_FIELDS = [
  "model",
  "doors",
  "seats",
  "luggage",
  "transmission",
  "airConditioning",
  "fuelType",
  "age",
  "pricePerHour",
];

const pickVehicleFields = (body) =>
  VEHICLE_FIELDS.reduce((data, field) => {
    if (body[field] !== undefined) data[field] = body[field];
    return data;
  }, {});

const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: req.params.id },
    include: IMAGES_INCLUDE,
  });
  if (!vehicle) throw new HttpError(404, "Vehicle not found.");
  res.json(serializeVehicle(vehicle));
});

const getAllVehicles = asyncHandler(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({ include: IMAGES_INCLUDE });
  res.json(vehicles.map(serializeVehicle));
});

const getVehiclesByPage = asyncHandler(async (req, res) => {
  const { page, size, direction, sortField } = parsePageParams(req.query, {
    defaultSize: 6,
    allowedSortFields: ALLOWED_SORT_FIELDS,
  });

  const [content, totalElements] = await Promise.all([
    prisma.vehicle.findMany({
      skip: page * size,
      take: size,
      orderBy: { [sortField]: direction },
      include: IMAGES_INCLUDE,
    }),
    prisma.vehicle.count(),
  ]);

  res.json(
    buildPageResponse({
      content: content.map(serializeVehicle),
      totalElements,
      page,
      size,
      sortField,
    })
  );
});

const addVehicle = asyncHandler(async (req, res) => {
  const image = await prisma.vehicleImage.findUnique({ where: { id: req.params.imageId } });
  if (!image) throw new HttpError(404, "Image not found.");

  const vehicle = await prisma.vehicle.create({
    data: {
      ...pickVehicleFields(req.body),
      builtIn: false,
      images: { connect: { id: image.id } },
    },
    include: IMAGES_INCLUDE,
  });

  res.status(201).json(serializeVehicle(vehicle));
});

const updateVehicle = asyncHandler(async (req, res) => {
  const { id, imageId } = req.query;
  if (!id) throw new HttpError(400, "Missing vehicle id.");

  const target = await prisma.vehicle.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "Vehicle not found.");
  if (target.builtIn) throw new HttpError(403, "This vehicle cannot be modified.");

  if (imageId) {
    const image = await prisma.vehicleImage.findUnique({ where: { id: imageId } });
    if (!image) throw new HttpError(404, "Image not found.");
    await prisma.vehicleImage.update({ where: { id: imageId }, data: { vehicleId: id } });
  }

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: pickVehicleFields(req.body),
    include: IMAGES_INCLUDE,
  });

  res.json(serializeVehicle(vehicle));
});

const deleteVehicle = asyncHandler(async (req, res) => {
  const target = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Vehicle not found.");
  if (target.builtIn) throw new HttpError(403, "This vehicle cannot be deleted.");

  await prisma.vehicle.delete({ where: { id: target.id } });
  res.json({ message: "Vehicle deleted." });
});

module.exports = {
  getVehicleById,
  getAllVehicles,
  getVehiclesByPage,
  addVehicle,
  updateVehicle,
  deleteVehicle,
};
