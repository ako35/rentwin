const prisma = require("./prisma");
const HttpError = require("./http-error");

// Checks whether a car is free for [pickUpTime, dropOffTime). Shared by the
// availability-check endpoint and by reservation creation/update, which must
// never trust a stale client-side "available" flag. Pricing was removed, so
// totalPrice is always 0.
const checkAvailability = async (carId, pickUpTime, dropOffTime, { excludeReservationId } = {}) => {
  if (!pickUpTime || !dropOffTime || dropOffTime <= pickUpTime) {
    throw new HttpError(400, "Invalid pick-up/drop-off time range.");
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: carId } });
  if (!vehicle) throw new HttpError(404, "Vehicle not found.");

  const overlap = await prisma.reservation.findFirst({
    where: {
      carId,
      status: { not: "CANCELLED" },
      id: excludeReservationId ? { not: excludeReservationId } : undefined,
      pickUpTime: { lt: dropOffTime },
      dropOffTime: { gt: pickUpTime },
    },
  });

  return { available: !overlap, totalPrice: 0, vehicle };
};

module.exports = { checkAvailability };
