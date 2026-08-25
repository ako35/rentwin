const prisma = require("./prisma");
const HttpError = require("./http-error");
const { hoursBetween, round2 } = require("./dates");

// Checks whether a car is free for [pickUpTime, dropOffTime), and computes
// the price for that window. Shared by the availability-check endpoint and
// by reservation creation/update, which must never trust a client-supplied
// price or a stale client-side "available" flag.
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

  const totalPrice = round2(vehicle.pricePerHour * hoursBetween(pickUpTime, dropOffTime));

  return { available: !overlap, totalPrice, vehicle };
};

module.exports = { checkAvailability };
