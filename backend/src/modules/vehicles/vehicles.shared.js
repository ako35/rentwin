const dayjs = require("dayjs");
const prisma = require("../../lib/prisma");

const ALLOWED_SORT_FIELDS = ["id", "model"];
const IMAGES_AND_BRANCH_INCLUDE = { images: { orderBy: { createdAt: "asc" } }, branch: true };

// A vehicle is "RENTED" when it has an open contract (not cancelled, not yet
// marked returned) whose rental window overlaps today — so a contract created
// for today counts right away, not only from its exact pick-up hour. Shared by
// the admin list (per-row status) and the fleet-stats summary.
const getRentedVehicleIds = async (vehicleIds) => {
  const active = await prisma.contract.findMany({
    where: {
      carId: { in: vehicleIds },
      status: { notIn: ["CANCELLED", "DONE"] },
      pickUpTime: { lte: dayjs().endOf("day").toDate() },
      dropOffTime: { gte: dayjs().startOf("day").toDate() },
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
