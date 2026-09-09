const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { serializeVehicle } = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const { parseFrontendDateTime } = require("../../lib/dates");
const { getBusyVehicleIds } = require("../../lib/availability");
const asyncHandler = require("../../middleware/async-handler");
const {
  ALLOWED_SORT_FIELDS,
  IMAGES_AND_BRANCH_INCLUDE,
  loadModelImageMap,
  getRentedVehicleIds,
  getVehicleStatus,
} = require("./vehicles.shared");
const { pickVehicleFields } = require("./vehicle-fields");

// Prisma unique-constraint violation on Vehicle.licensePlate -> a clean 409.
const isPlateClash = (err) =>
  err?.code === "P2002" && (err.meta?.target || []).some((t) => /licensePlate/i.test(t));

const plateTakenError = () =>
  new HttpError(409, "Bu plaka ile kayıtlı bir araç zaten var.", "LICENSE_PLATE_TAKEN");

const getVehicleById = asyncHandler(async (req, res) => {
  const [vehicle, modelImages] = await Promise.all([
    prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: IMAGES_AND_BRANCH_INCLUDE,
    }),
    loadModelImageMap(),
  ]);
  if (!vehicle) throw new HttpError(404, "Vehicle not found.");
  res.json(serializeVehicle(vehicle, modelImages));
});

const getAllVehicles = asyncHandler(async (req, res) => {
  const [vehicles, modelImages] = await Promise.all([
    prisma.vehicle.findMany({ include: IMAGES_AND_BRANCH_INCLUDE }),
    loadModelImageMap(),
  ]);
  res.json(vehicles.map((vehicle) => serializeVehicle(vehicle, modelImages)));
});

// Public browse/search: always hides out-of-service vehicles; when a valid
// pickUpTime/dropOffTime pair is given (homepage search -> /vehicles), also
// hides vehicles already booked for that window.
const getVehiclesByPage = asyncHandler(async (req, res) => {
  const { page, size, direction, sortField } = parsePageParams(req.query, {
    defaultSize: 6,
    allowedSortFields: ALLOWED_SORT_FIELDS,
  });

  const where = { outOfService: false };
  const pickUp = parseFrontendDateTime(req.query.pickUpTime);
  const dropOff = parseFrontendDateTime(req.query.dropOffTime);
  if (pickUp && dropOff && dropOff > pickUp) {
    const busyIds = await getBusyVehicleIds(pickUp, dropOff);
    if (busyIds.size) where.id = { notIn: [...busyIds] };
  }

  const [content, totalElements, modelImages] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip: page * size,
      take: size,
      orderBy: { [sortField]: direction },
      include: IMAGES_AND_BRANCH_INCLUDE,
    }),
    prisma.vehicle.count({ where }),
    loadModelImageMap(),
  ]);

  res.json(
    buildPageResponse({
      content: content.map((vehicle) => serializeVehicle(vehicle, modelImages)),
      totalElements,
      page,
      size,
      sortField,
    })
  );
});

const getVehiclesByPageAdmin = asyncHandler(async (req, res) => {
  const { page, size, direction, sortField } = parsePageParams(req.query, {
    defaultSize: 20,
    allowedSortFields: ALLOWED_SORT_FIELDS,
  });

  const [content, totalElements, modelImages] = await Promise.all([
    prisma.vehicle.findMany({
      skip: page * size,
      take: size,
      orderBy: { [sortField]: direction },
      include: IMAGES_AND_BRANCH_INCLUDE,
    }),
    prisma.vehicle.count(),
    loadModelImageMap(),
  ]);

  const rentedIds = await getRentedVehicleIds(content.map((v) => v.id));

  res.json(
    buildPageResponse({
      content: content.map((vehicle) => ({
        ...serializeVehicle(vehicle, modelImages),
        status: getVehicleStatus(vehicle, rentedIds),
      })),
      totalElements,
      page,
      size,
      sortField,
    })
  );
});

const addVehicle = asyncHandler(async (req, res) => {
  let vehicle;
  try {
    vehicle = await prisma.vehicle.create({
      data: { ...pickVehicleFields(req.body), builtIn: false },
      include: IMAGES_AND_BRANCH_INCLUDE,
    });
  } catch (err) {
    if (isPlateClash(err)) throw plateTakenError();
    throw err;
  }

  res.status(201).json(serializeVehicle(vehicle, await loadModelImageMap()));
});

const updateVehicle = asyncHandler(async (req, res) => {
  const { id } = req.query;
  if (!id) throw new HttpError(400, "Missing vehicle id.");

  const target = await prisma.vehicle.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "Vehicle not found.");
  if (target.builtIn) throw new HttpError(403, "This vehicle cannot be modified.");

  let vehicle;
  try {
    vehicle = await prisma.vehicle.update({
      where: { id },
      data: pickVehicleFields(req.body),
      include: IMAGES_AND_BRANCH_INCLUDE,
    });
  } catch (err) {
    if (isPlateClash(err)) throw plateTakenError();
    throw err;
  }

  res.json(serializeVehicle(vehicle, await loadModelImageMap()));
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
  getVehiclesByPageAdmin,
  addVehicle,
  updateVehicle,
  deleteVehicle,
};
