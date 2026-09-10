const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { serializeVehicle } = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const { parseFrontendDateTime } = require("../../lib/dates");
const { getBusyVehicleIds } = require("../../lib/availability");
const { purgeVehicle } = require("../../lib/vehicle-purge");
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
  // A sold vehicle is retired from the fleet — treat it as gone on the public
  // detail route (matches the browse list, the sitemap and the bot prerender).
  if (!vehicle || vehicle.soldAt) throw new HttpError(404, "Vehicle not found.");
  res.json(serializeVehicle(vehicle, modelImages));
});

const getAllVehicles = asyncHandler(async (req, res) => {
  const [vehicles, modelImages] = await Promise.all([
    prisma.vehicle.findMany({ where: { soldAt: null }, include: IMAGES_AND_BRANCH_INCLUDE }),
    loadModelImageMap(),
  ]);
  res.json(vehicles.map((vehicle) => serializeVehicle(vehicle, modelImages)));
});

// Public browse/search: always hides out-of-service and sold vehicles; when a
// valid pickUpTime/dropOffTime pair is given (homepage search -> /vehicles),
// also hides vehicles already booked for that window.
const getVehiclesByPage = asyncHandler(async (req, res) => {
  const { page, size, direction, sortField } = parsePageParams(req.query, {
    defaultSize: 6,
    allowedSortFields: ALLOWED_SORT_FIELDS,
  });

  const where = { outOfService: false, soldAt: null };
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

  // Default view is the live fleet; ?sold=1 switches to the sold archive.
  const where = req.query.sold === "1" ? { soldAt: { not: null } } : { soldAt: null };

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

// Blocks a vehicle that still holds any open/pending rental — the same guard
// used before marking it sold.
const activeRentalGuard = async (carId) => {
  const [contract, reservation] = await Promise.all([
    prisma.contract.findFirst({
      where: { carId, status: { notIn: ["CANCELLED", "DONE"] } },
      select: { id: true },
    }),
    prisma.reservation.findFirst({
      where: { carId, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { id: true },
    }),
  ]);
  if (contract || reservation) {
    throw new HttpError(
      409,
      "Bu aracın açık veya gelecek tarihli kiralaması/rezervasyonu var.",
      "VEHICLE_HAS_ACTIVE_RENTALS"
    );
  }
};

const markVehicleSold = asyncHandler(async (req, res) => {
  const target = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Vehicle not found.");
  if (target.builtIn) throw new HttpError(403, "This vehicle cannot be modified.");

  await activeRentalGuard(target.id);

  const soldAt = req.body?.soldAt ? new Date(req.body.soldAt) : new Date();
  if (Number.isNaN(soldAt.getTime())) throw new HttpError(400, "Invalid sale date.");
  const saleNote = typeof req.body?.saleNote === "string" ? req.body.saleNote.trim() || null : null;

  const vehicle = await prisma.vehicle.update({
    where: { id: target.id },
    data: { soldAt, saleNote },
    include: IMAGES_AND_BRANCH_INCLUDE,
  });
  res.json(serializeVehicle(vehicle, await loadModelImageMap()));
});

const unmarkVehicleSold = asyncHandler(async (req, res) => {
  const target = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Vehicle not found.");

  const vehicle = await prisma.vehicle.update({
    where: { id: target.id },
    data: { soldAt: null, saleNote: null },
    include: IMAGES_AND_BRANCH_INCLUDE,
  });
  res.json(serializeVehicle(vehicle, await loadModelImageMap()));
});

const deleteVehicle = asyncHandler(async (req, res) => {
  const target = await prisma.vehicle.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      builtIn: true,
      soldAt: true,
      _count: { select: { contracts: true, reservations: true } },
    },
  });
  if (!target) throw new HttpError(404, "Vehicle not found.");
  if (target.builtIn) throw new HttpError(403, "This vehicle cannot be deleted.");

  // A live-fleet vehicle that has rental history can't be hard-deleted — mark it
  // sold first. A sold vehicle can always be purged on demand (cari preserved).
  const hasHistory = target._count.contracts > 0 || target._count.reservations > 0;
  if (hasHistory && !target.soldAt) {
    throw new HttpError(
      409,
      "Bu aracın kiralama geçmişi var. Önce 'Satıldı' olarak işaretleyin.",
      "VEHICLE_HAS_HISTORY"
    );
  }

  await purgeVehicle(target.id);
  res.json({ message: "Vehicle deleted." });
});

module.exports = {
  getVehicleById,
  getAllVehicles,
  getVehiclesByPage,
  getVehiclesByPageAdmin,
  addVehicle,
  updateVehicle,
  markVehicleSold,
  unmarkVehicleSold,
  deleteVehicle,
};
