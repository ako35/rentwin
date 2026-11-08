const dayjs = require("dayjs");
const prisma = require("../../lib/prisma");
const { modelImageKey } = require("../../lib/serializers");
const {
  modelKey,
  summarizeVariants,
  buildCanonicalVehicleMap,
  pickRelatedModels,
} = require("../../lib/vehicle-models");

const ALLOWED_SORT_FIELDS = ["id", "model"];
const IMAGES_AND_BRANCH_INCLUDE = { images: { orderBy: { createdAt: "asc" } }, branch: true };

// All VehicleModelImage rows keyed (brand+model+colour, generic colour "")
// for serializeVehicle's two-tier lookup. The table holds a handful of rows
// per make+model (one generic + a few colour variants at most), so a full
// scan is cheap.
const loadModelImageMap = async () => {
  const rows = await prisma.vehicleModelImage.findMany();
  return new Map(rows.map((row) => [modelImageKey(row.brand, row.model, row.color), row]));
};

// A vehicle is "RENTED" when it has an open contract (not cancelled, not yet
// marked returned via VehicleReturnModal -> DONE) that has started. There is
// deliberately no upper bound on dropOffTime: that field is only the
// *scheduled* return, and an open contract past it means the car is overdue,
// not free — nothing has told the system it actually came back. Bounding on
// dropOffTime used to make an overdue-but-still-open contract show the car as
// AVAILABLE the day after its scheduled drop-off, which is exactly wrong.
// Shared by the admin list (per-row status) and the fleet-stats summary.
const getRentedVehicleIds = async (vehicleIds) => {
  const active = await prisma.contract.findMany({
    where: {
      carId: { in: vehicleIds },
      status: { notIn: ["CANCELLED", "DONE"] },
      pickUpTime: { lte: dayjs().endOf("day").toDate() },
    },
    select: { carId: true },
  });
  return new Set(active.map((r) => r.carId));
};

const getVehicleStatus = (vehicle, rentedIds) => {
  if (vehicle.soldAt) return "SOLD";
  if (vehicle.outOfService) return "OUT_OF_SERVICE";
  if (vehicle.passiveAt) return "PASSIVE";
  if (rentedIds.has(vehicle.id)) return "RENTED";
  return "AVAILABLE";
};

// The single contract making a vehicle currently RENTED (see getRentedVehicleIds
// above for the exact same open/started condition) — lets the vehicle detail
// screen link its "Kirada" badge straight to that contract. Only ever one such
// contract can exist per vehicle (checkAvailability blocks a clashing second one).
const getActiveRentalContractId = async (vehicleId) => {
  const contract = await prisma.contract.findFirst({
    where: {
      carId: vehicleId,
      status: { notIn: ["CANCELLED", "DONE"] },
      pickUpTime: { lte: dayjs().endOf("day").toDate() },
    },
    select: { id: true },
  });
  return contract?.id || null;
};

// Units of the same model share one canonical page — see
// lib/vehicle-models.js for why (Search Console folded nearly every vehicle
// page into one when each unit stood on its own).
const ACTIVE_VEHICLE_WHERE = { outOfService: false, soldAt: null, passiveAt: null };
const MODEL_CONTEXT_SELECT = {
  id: true,
  brand: true,
  model: true,
  modelYear: true,
  transmission: true,
  fuelType: true,
  bodyType: true,
  createdAt: true,
};

// Everything the public detail route and the bot prerender need about a
// vehicle's model, from one fleet query (the active fleet is a few dozen rows):
//   canonicalId — the model's canonical unit, or null when this IS it
//   variants    — summary of the model's active units (count, years, …)
//   related     — canonical pages of a few other models
const loadModelContext = async (vehicle) => {
  const active = await prisma.vehicle.findMany({ where: ACTIVE_VEHICLE_WHERE, select: MODEL_CONTEXT_SELECT });
  const key = modelKey(vehicle.brand, vehicle.model);
  const units = active.filter((v) => modelKey(v.brand, v.model) === key);
  let canonicalId = null;
  if (vehicle.brand && vehicle.model && units.length) {
    const map = buildCanonicalVehicleMap(units);
    // An out-of-service unit still renders, but it isn't part of the active
    // cluster — point it at the active canonical rather than at itself.
    canonicalId = map.has(vehicle.id) ? map.get(vehicle.id) : [...map].find(([, c]) => c === null)[0];
  }
  return {
    canonicalId,
    variants: summarizeVariants(units.length ? units : [vehicle]),
    related: pickRelatedModels(active, vehicle),
  };
};

const findCanonicalVehicleId = async (vehicle) => (await loadModelContext(vehicle)).canonicalId;

module.exports = {
  ALLOWED_SORT_FIELDS,
  IMAGES_AND_BRANCH_INCLUDE,
  loadModelImageMap,
  getRentedVehicleIds,
  getVehicleStatus,
  getActiveRentalContractId,
  buildCanonicalVehicleMap,
  findCanonicalVehicleId,
  loadModelContext,
};
