const prisma = require("../../lib/prisma");

const ALLOWED_SORT_FIELDS = ["id", "model"];
const IMAGES_AND_BRANCH_INCLUDE = { images: { orderBy: { createdAt: "asc" } }, branch: true };

// Vehicles with an active (non-cancelled, currently in-window) contract right
// now are "RENTED". Shared by the admin list (per-row status) and the
// fleet-stats summary (aggregate counts).
const getRentedVehicleIds = async (vehicleIds) => {
  const now = new Date();
  const active = await prisma.contract.findMany({
    where: {
      carId: { in: vehicleIds },
      status: { not: "CANCELLED" },
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

module.exports = {
  ALLOWED_SORT_FIELDS,
  IMAGES_AND_BRANCH_INCLUDE,
  getRentedVehicleIds,
  getVehicleStatus,
};
