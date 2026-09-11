const prisma = require("./prisma");
const HttpError = require("./http-error");

// Statuses that still hold a car for its date range. A DONE contract means the
// car has already been handed back, so it no longer blocks a new booking that
// overlaps its original window — only an open contract does. (Matches
// getRentedVehicleIds in vehicles.shared.js.)
const BLOCKING_CONTRACT = { status: { notIn: ["CANCELLED", "DONE"] } };
const BLOCKING_RESERVATION = { status: { in: ["PENDING", "CONFIRMED"] } };

// An open contract's dropOffTime is only the *scheduled* return — it is not
// proof the car came back. Until the operator formally closes it out
// (VehicleReturnModal -> DONE), an open contract that has already started
// blocks every later request, no matter how far past its scheduled drop-off —
// otherwise an overdue return would silently let the same car be double-booked
// for the next slot. So contracts get a half-open window (no upper bound); a
// reservation is just an advance hold with a real window, so it keeps the
// normal bounded overlap.
const contractWindow = (dropOffTime) => ({ pickUpTime: { lt: dropOffTime } });
const reservationWindow = (pickUpTime, dropOffTime) => ({
  pickUpTime: { lt: dropOffTime },
  dropOffTime: { gt: pickUpTime },
});

// Checks whether a car is free for [pickUpTime, dropOffTime). A car is taken if
// it has a clashing non-cancelled Contract OR an overlapping pending/
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
  if (vehicle.soldAt) throw new HttpError(409, "Bu araç satılmış, kiralanamaz.", "VEHICLE_SOLD");

  const [contractClash, reservationClash] = await Promise.all([
    prisma.contract.findFirst({
      where: {
        carId,
        ...BLOCKING_CONTRACT,
        ...contractWindow(dropOffTime),
        id: excludeContractId ? { not: excludeContractId } : undefined,
      },
      select: { id: true },
    }),
    prisma.reservation.findFirst({
      where: {
        carId,
        ...BLOCKING_RESERVATION,
        ...reservationWindow(pickUpTime, dropOffTime),
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
      },
      select: { id: true },
    }),
  ]);

  return { available: !contractClash && !reservationClash, totalPrice: 0, vehicle };
};

// Vehicle ids taken by an overlapping open Contract or pending/confirmed
// Reservation in [pickUpTime, dropOffTime). Feeds any listing that needs to
// show only what's actually free for a date range. `excludeContractId` /
// `excludeReservationId` drop the record being edited from the clash check.
const getBusyVehicleIds = async (
  pickUpTime,
  dropOffTime,
  { excludeContractId, excludeReservationId } = {}
) => {
  const [contractBusy, reservationBusy] = await Promise.all([
    prisma.contract.findMany({
      where: {
        ...BLOCKING_CONTRACT,
        ...contractWindow(dropOffTime),
        id: excludeContractId ? { not: excludeContractId } : undefined,
      },
      select: { carId: true },
    }),
    prisma.reservation.findMany({
      where: {
        ...BLOCKING_RESERVATION,
        ...reservationWindow(pickUpTime, dropOffTime),
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
      },
      select: { carId: true },
    }),
  ]);
  return new Set([...contractBusy, ...reservationBusy].map((r) => r.carId));
};

module.exports = { checkAvailability, getBusyVehicleIds };
