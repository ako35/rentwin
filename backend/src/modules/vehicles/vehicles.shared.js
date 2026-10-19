const dayjs = require("dayjs");
const prisma = require("../../lib/prisma");
const { modelImageKey } = require("../../lib/serializers");

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

// Vehicles sharing brand+model+year+transmission+fuel render the exact same
// templated title/description (DetailsPanel.jsx on the frontend, seo-ld.js's
// renderVehicleDetailBody on the bot-prerender side) — typically several
// units of the same car bought as one fleet batch. Search engines correctly
// treat these as duplicate content and keep only one of them in the index
// (Search Console: "Duplicate, Google chose different canonical than user").
// This picks that one ourselves — the longest-listed in the cluster, likely
// to already carry the most signals — so every sibling can deliberately point
// `rel=canonical` at it instead of leaving the choice to Google.
const normalizeSpec = (s) => (s || "").replace(/\s+/g, " ").trim().toUpperCase();

// vehicles: [{ id, brand, model, modelYear, transmission, fuelType, createdAt }]
// Returns Map<vehicleId, canonicalId|null> — null means "this IS the canonical".
const buildCanonicalVehicleMap = (vehicles) => {
  const clusters = new Map();
  vehicles.forEach((v) => {
    const key = [
      normalizeSpec(v.brand),
      normalizeSpec(v.model),
      v.modelYear || "",
      v.transmission || "",
      v.fuelType || "",
    ].join("|");
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(v);
  });

  const result = new Map();
  clusters.forEach((group) => {
    if (group.length < 2) {
      result.set(group[0].id, null);
      return;
    }
    const sorted = [...group].sort(
      (a, b) =>
        (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0) || (a.id < b.id ? -1 : 1)
    );
    const winnerId = sorted[0].id;
    group.forEach((v) => result.set(v.id, v.id === winnerId ? null : winnerId));
  });
  return result;
};

// Single-vehicle lookup for the public detail route + bot-prerender — queries
// just this vehicle's spec cluster rather than the whole fleet.
const findCanonicalVehicleId = async (vehicle) => {
  if (!vehicle.brand || !vehicle.model) return null;
  const siblings = await prisma.vehicle.findMany({
    where: {
      outOfService: false,
      soldAt: null,
      passiveAt: null,
      modelYear: vehicle.modelYear,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
    },
    select: { id: true, brand: true, model: true, modelYear: true, transmission: true, fuelType: true, createdAt: true },
  });
  const pool = siblings.some((s) => s.id === vehicle.id) ? siblings : [...siblings, vehicle];
  return buildCanonicalVehicleMap(pool).get(vehicle.id) ?? null;
};

module.exports = {
  ALLOWED_SORT_FIELDS,
  IMAGES_AND_BRANCH_INCLUDE,
  loadModelImageMap,
  getRentedVehicleIds,
  getVehicleStatus,
  getActiveRentalContractId,
  buildCanonicalVehicleMap,
  findCanonicalVehicleId,
};
