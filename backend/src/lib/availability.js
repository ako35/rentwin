const prisma = require("./prisma");
const HttpError = require("./http-error");

// Statuses that still hold a car for its date range.
const BLOCKING_CONTRACT = { status: { not: "CANCELLED" } };
const BLOCKING_RESERVATION = { status: { in: ["PENDING", "CONFIRMED"] } };

// Checks whether a car is free for [pickUpTime, dropOffTime). A car is taken if
// it has an overlapping non-cancelled Contract OR an overlapping pending/
// confirmed Reservation. Shared by the availability endpoint, reservation
// creation and contract create/update — none may trust a stale client flag.
// Pricing was removed, so totalPrice is always 0.
const checkAvailability = async (
  carId,
  pickUpTime,
  dropOffTime,
  { excludeContractId, excludeReservationId } = {}
) => {
  if (!pickUpTime || !dropOffTime || dropOffTime <= pickUpTime) {
    throw new HttpError(400, "Invalid pick-up/drop-off time range.");
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: carId } });
  if (!vehicle) throw new HttpError(404, "Vehicle not found.");

  const window = { pickUpTime: { lt: dropOffTime }, dropOffTime: { gt: pickUpTime } };

  const [contractClash, reservationClash] = await Promise.all([
    prisma.contract.findFirst({
      where: {
        carId,
        ...BLOCKING_CONTRACT,
        ...window,
        id: excludeContractId ? { not: excludeContractId } : undefined,
      },
      select: { id: true },
    }),
    prisma.reservation.findFirst({
      where: {
        carId,
        ...BLOCKING_RESERVATION,
        ...window,
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
      },
      select: { id: true },
    }),
  ]);

  return { available: !contractClash && !reservationClash, totalPrice: 0, vehicle };
};

module.exports = { checkAvailability };
