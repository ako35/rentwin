const dayjs = require("dayjs");
const prisma = require("../../lib/prisma");
const { modelImageKey } = require("../../lib/serializers");

const ALLOWED_SORT_FIELDS = ["id", "model"];
const IMAGES_AND_BRANCH_INCLUDE = { images: { orderBy: { createdAt: "asc" } }, branch: true };

// All VehicleModelImage rows keyed for serializeVehicle. The table holds one row
// per make+model (a few dozen at most), so a full scan is cheap.
const loadModelImageMap = async () => {
  const rows = await prisma.vehicleModelImage.findMany();
  return new Map(rows.map((row) => [modelImageKey(row.brand, row.model), row]));
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
  if (rentedIds.has(vehicle.id)) return "RENTED";
  return "AVAILABLE";
};

module.exports = {
  ALLOWED_SORT_FIELDS,
  IMAGES_AND_BRANCH_INCLUDE,
  loadModelImageMap,
  getRentedVehicleIds,
  getVehicleStatus,
};
