const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { serializeVehicle } = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");

const ALLOWED_SORT_FIELDS = ["id", "model", "pricePerHour", "age"];
const IMAGES_AND_BRANCH_INCLUDE = { images: { orderBy: { createdAt: "asc" } }, branch: true };

const VEHICLE_FIELDS = [
  "brand",
  "model",
  "licensePlate",
  "doors",
  "seats",
  "luggage",
  "transmission",
  "airConditioning",
  "fuelType",
  "age",
  "pricePerHour",
  "outOfService",
  "branchId",
  "nextMaintenanceDate",
  "nextInspectionDate",
  "modelYear",
  "chassisNo",
  "engineNo",
  "currentKm",
  "registrationSerialNo",
  "registrationDate",
  "ownershipType",
  "color",
  "notes",
];

const DATE_FIELDS = ["nextMaintenanceDate", "nextInspectionDate", "registrationDate"];
// Optional numeric columns: an empty-string form value must land as null, not NaN.
const NULLABLE_NUMBER_FIELDS = ["modelYear", "currentKm"];
// Optional string/enum columns: an empty-string form value must land as null.
const NULLABLE_STRING_FIELDS = [
  "chassisNo",
  "engineNo",
  "registrationSerialNo",
  "ownershipType",
  "color",
  "notes",
  "branchId",
];

const pickVehicleFields = (body) =>
  VEHICLE_FIELDS.reduce((data, field) => {
    if (body[field] === undefined) return data;

    const value = body[field];

    if (DATE_FIELDS.includes(field)) {
      data[field] = value ? new Date(value) : null;
    } else if (NULLABLE_NUMBER_FIELDS.includes(field)) {
      data[field] = value === "" || value === null ? null : Number(value);
    } else if (NULLABLE_STRING_FIELDS.includes(field)) {
      data[field] = value === "" ? null : value;
    } else {
      data[field] = value;
    }

    return data;
  }, {});

// Vehicles due for maintenance/inspection within this many days count toward
// the dashboard's "Bakim"/"Muayene" alert badges.
const DUE_SOON_DAYS = 30;

const isDueSoon = (date) => {
  if (!date) return false;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + DUE_SOON_DAYS);
  return new Date(date) <= threshold;
};

const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: req.params.id },
    include: IMAGES_AND_BRANCH_INCLUDE,
  });
  if (!vehicle) throw new HttpError(404, "Vehicle not found.");
  res.json(serializeVehicle(vehicle));
});

const getAllVehicles = asyncHandler(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({ include: IMAGES_AND_BRANCH_INCLUDE });
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
      include: IMAGES_AND_BRANCH_INCLUDE,
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

// Vehicles with an active (non-cancelled, currently in-window) reservation
// right now are "RENTED". Shared by the admin list (per-row status) and the
// fleet-stats summary (aggregate counts).
const getRentedVehicleIds = async (vehicleIds) => {
  const now = new Date();
  const active = await prisma.reservation.findMany({
    where: {
      carId: { in: vehicleIds },
      status: "CREATED",
      pickUpTime: { lte: now },
      dropOffTime: { gte: now },
    },
    select: { carId: true },
  });
  return new Set(active.map((r) => r.carId));
};

const getVehicleStatus = (vehicle, rentedIds) => {
  if (vehicle.outOfService) return "OUT_OF_SERVICE";
  if (rentedIds.has(vehicle.id)) return "RENTED";
  return "AVAILABLE";
};

const getVehiclesByPageAdmin = asyncHandler(async (req, res) => {
  const { page, size, direction, sortField } = parsePageParams(req.query, {
    defaultSize: 20,
    allowedSortFields: ALLOWED_SORT_FIELDS,
  });

  const [content, totalElements] = await Promise.all([
    prisma.vehicle.findMany({
      skip: page * size,
      take: size,
      orderBy: { [sortField]: direction },
      include: IMAGES_AND_BRANCH_INCLUDE,
    }),
    prisma.vehicle.count(),
  ]);

  const rentedIds = await getRentedVehicleIds(content.map((v) => v.id));

  res.json(
    buildPageResponse({
      content: content.map((vehicle) => ({
        ...serializeVehicle(vehicle),
        status: getVehicleStatus(vehicle, rentedIds),
      })),
      totalElements,
      page,
      size,
      sortField,
    })
  );
});

const getFleetStats = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const vehicles = await prisma.vehicle.findMany({
    where: branchId ? { branchId } : undefined,
    select: {
      id: true,
      outOfService: true,
      nextMaintenanceDate: true,
      nextInspectionDate: true,
    },
  });

  const outOfService = vehicles.filter((v) => v.outOfService).length;
  const inServiceIds = vehicles.filter((v) => !v.outOfService).map((v) => v.id);
  const rentedIds = await getRentedVehicleIds(inServiceIds);

  const total = vehicles.length;
  const rented = rentedIds.size;
  const available = total - outOfService - rented;
  const rate = (count) => (total > 0 ? Math.round((count / total) * 100) : 0);
  const maintenanceDue = vehicles.filter((v) => isDueSoon(v.nextMaintenanceDate)).length;
  const inspectionDue = vehicles.filter((v) => isDueSoon(v.nextInspectionDate)).length;

  res.json({
    total,
    rented,
    available,
    outOfService,
    occupancyRate: rate(rented),
    outOfServiceRate: rate(outOfService),
    maintenanceDue,
    inspectionDue,
  });
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
    include: IMAGES_AND_BRANCH_INCLUDE,
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
    include: IMAGES_AND_BRANCH_INCLUDE,
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
  getVehiclesByPageAdmin,
  getFleetStats,
  addVehicle,
  updateVehicle,
  deleteVehicle,
};
