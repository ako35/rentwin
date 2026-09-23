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
  getActiveRentalContractId,
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

// Admin single-vehicle fetch — unlike the public route this still returns a
// sold vehicle so its detail page (and the "undo sale" action) keep working.
const getVehicleByIdAdmin = asyncHandler(async (req, res) => {
  const [vehicle, modelImages] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: req.params.id }, include: IMAGES_AND_BRANCH_INCLUDE }),
    loadModelImageMap(),
  ]);
  if (!vehicle) throw new HttpError(404, "Vehicle not found.");
  const [rentedIds, kbsContract, activeContractId] = await Promise.all([
    getRentedVehicleIds([vehicle.id]),
    // Which KABİS portal the car is currently filed under, if any — the open
    // contract's own kbsSystem (set when it was filed, cleared on release).
    prisma.contract.findFirst({
      where: {
        carId: vehicle.id,
        status: { notIn: ["CANCELLED", "DONE"] },
        kbsNotifiedAt: { not: null },
        kbsReleasedAt: null,
      },
      orderBy: { pickUpTime: "desc" },
      select: { kbsSystem: true },
    }),
    getActiveRentalContractId(vehicle.id),
  ]);
  res.json({
    ...serializeVehicle(vehicle, modelImages),
    status: getVehicleStatus(vehicle, rentedIds),
    kbsSystem: kbsContract?.kbsSystem || null,
    activeContractId,
  });
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

// Turkish labels for the enum/computed fields a free-text search should also
// reach — kept in sync by hand with src/i18n/locales/tr/{common,admin}.json
// (options.transmissionTypes / options.fuelTypes / vehicleStatus).
const TRANSMISSION_LABELS = { Manual: "manuel", SemiAutomatic: "yarı otomatik", Automatic: "otomatik" };
const FUEL_LABELS = {
  Diesel: "dizel",
  Gasoline: "benzin",
  Hybrid: "hibrit",
  Electricity: "elektrik",
  LPG: "lpg",
  CNG: "cng",
  Hydrogen: "hidrojen",
};
const STATUS_LABELS = { AVAILABLE: "müsait", RENTED: "kirada", OUT_OF_SERVICE: "servis dışı" };

// A single word from the search box: which plain-column/relation conditions
// it satisfies (OR'd together), and which computed status value it names, if
// any ("otomatik egea" -> two words, each resolved separately, then AND'd).
const resolveToken = (token) => {
  const lower = token.toLocaleLowerCase("tr-TR");
  const transmissions = Object.entries(TRANSMISSION_LABELS)
    .filter(([, label]) => label.includes(lower))
    .map(([value]) => value);
  const fuels = Object.entries(FUEL_LABELS)
    .filter(([, label]) => label.includes(lower))
    .map(([value]) => value);
  const statuses = Object.entries(STATUS_LABELS)
    .filter(([, label]) => label.includes(lower))
    .map(([value]) => value);

  return {
    status: statuses[0] || null,
    or: [
      { licensePlate: { contains: token, mode: "insensitive" } },
      { brand: { contains: token, mode: "insensitive" } },
      { model: { contains: token, mode: "insensitive" } },
      { branch: { name: { contains: token, mode: "insensitive" } } },
      ...(transmissions.length ? [{ transmission: { in: transmissions } }] : []),
      ...(fuels.length ? [{ fuelType: { in: fuels } }] : []),
    ],
  };
};

// One search box stands in for every column shown on the admin list
// (plaka/marka/model/şube/vites/yakıt/durum), and multiple words are AND'd
// together ("otomatik egea" -> Automatic AND model contains "egea") while
// each word alone is OR'd across every field it could mean. Plate/brand/
// model/branch name are plain columns/relations, so word-level OR blocks
// fold straight into a native `where: { AND: [...] }`. Durum isn't a column
// — it's derived from outOfService + whether a contract currently has the
// car out (see getVehicleStatus) — so a word that names a status
// (Müsait/Kirada/Servis Dışı) is pulled out of the AND and applied as a
// separate, slower post-filter over the id set instead.
const getVehiclesByPageAdmin = asyncHandler(async (req, res) => {
  const { page, size, direction, sortField } = parsePageParams(req.query, {
    defaultSize: 20,
    allowedSortFields: ALLOWED_SORT_FIELDS,
  });

  const tokens = (req.query.q || "").trim().split(/\s+/).filter(Boolean).map(resolveToken);

  // Default view is the live fleet; ?sold=1 switches to the sold archive.
  const soldScope = req.query.sold === "1" ? { soldAt: { not: null } } : { soldAt: null };

  const statusValues = [...new Set(tokens.map((t) => t.status).filter(Boolean))];
  // A word names a status purely as a status ("kirada" isn't also a plate/
  // brand/model/branch/transmission/fuel word in practice) — keep it out of
  // the column AND so it doesn't force an always-false OR branch there.
  const columnTokens = tokens.filter((t) => !t.status);

  const where = {
    ...soldScope,
    ...(columnTokens.length ? { AND: columnTokens.map((t) => ({ OR: t.or })) } : {}),
  };

  if (statusValues.length) {
    // Two different status words ("kirada müsait") can never both be true.
    if (statusValues.length > 1) {
      res.json(buildPageResponse({ content: [], totalElements: 0, page, size, sortField }));
      return;
    }
    const [requiredStatus] = statusValues;

    const candidates = await prisma.vehicle.findMany({
      where,
      select: { id: true, outOfService: true },
      orderBy: { [sortField]: direction },
    });

    let matchingIds;
    if (requiredStatus === "OUT_OF_SERVICE") {
      matchingIds = candidates.filter((v) => v.outOfService).map((v) => v.id);
    } else {
      const inService = candidates.filter((v) => !v.outOfService);
      const rentedIds = await getRentedVehicleIds(inService.map((v) => v.id));
      matchingIds = inService
        .filter((v) => (requiredStatus === "RENTED" ? rentedIds.has(v.id) : !rentedIds.has(v.id)))
        .map((v) => v.id);
    }

    const pageIds = matchingIds.slice(page * size, page * size + size);
    const [rows, modelImages] = await Promise.all([
      pageIds.length
        ? prisma.vehicle.findMany({ where: { id: { in: pageIds } }, include: IMAGES_AND_BRANCH_INCLUDE })
        : [],
      loadModelImageMap(),
    ]);
    const byId = new Map(rows.map((v) => [v.id, v]));
    const rentedIdsForPage = await getRentedVehicleIds(pageIds);

    res.json(
      buildPageResponse({
        content: pageIds
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((vehicle) => ({
            ...serializeVehicle(vehicle, modelImages),
            status: getVehicleStatus(vehicle, rentedIdsForPage),
          })),
        totalElements: matchingIds.length,
        page,
        size,
        sortField,
      })
    );
    return;
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
  res.json({ ...serializeVehicle(vehicle, await loadModelImageMap()), status: getVehicleStatus(vehicle, new Set()) });
});

const unmarkVehicleSold = asyncHandler(async (req, res) => {
  const target = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Vehicle not found.");

  const vehicle = await prisma.vehicle.update({
    where: { id: target.id },
    data: { soldAt: null, saleNote: null },
    include: IMAGES_AND_BRANCH_INCLUDE,
  });
  const rentedIds = await getRentedVehicleIds([vehicle.id]);
  res.json({ ...serializeVehicle(vehicle, await loadModelImageMap()), status: getVehicleStatus(vehicle, rentedIds) });
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
  getVehicleByIdAdmin,
  getAllVehicles,
  getVehiclesByPage,
  getVehiclesByPageAdmin,
  addVehicle,
  updateVehicle,
  markVehicleSold,
  unmarkVehicleSold,
  deleteVehicle,
};
