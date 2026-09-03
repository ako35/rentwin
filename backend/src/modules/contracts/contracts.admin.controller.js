const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parseFrontendDateTime, resolveWindow } = require("../../lib/dates");
const { serializeScheduleRow, serializeVehicle } = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");
const { ALLOWED_SORT_FIELDS } = require("./contracts.shared");

const getContractsByPage = asyncHandler(async (req, res) => {
  const { page, size, direction, sortField } = parsePageParams(req.query, {
    defaultSize: 20,
    allowedSortFields: ALLOWED_SORT_FIELDS,
  });

  const { branchId, status, plate, customer } = req.query;
  const where = {
    ...(status ? { status } : {}),
    ...(branchId ? { car: { branchId } } : {}),
    ...(plate
      ? { car: { ...(branchId ? { branchId } : {}), licensePlate: { contains: plate, mode: "insensitive" } } }
      : {}),
    ...(customer
      ? {
          OR: [
            { corporate: { title: { contains: customer, mode: "insensitive" } } },
            { user: { firstName: { contains: customer, mode: "insensitive" } } },
            { user: { lastName: { contains: customer, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [content, totalElements] = await Promise.all([
    prisma.contract.findMany({
      where,
      skip: page * size,
      take: size,
      orderBy: { [sortField]: direction },
      include: {
        car: { select: { brand: true, model: true, licensePlate: true, branch: { select: { code: true } } } },
        user: { select: { firstName: true, lastName: true } },
        corporate: { select: { title: true } },
        payments: { select: { amount: true } },
        extensions: { select: { extraDays: true } },
      },
    }),
    prisma.contract.count({ where }),
  ]);

  const dayCount = (r) =>
    Math.max(1, Math.ceil((r.dropOffTime.getTime() - r.pickUpTime.getTime()) / 86400000));

  res.json(
    buildPageResponse({
      content: content.map((r) => ({
        id: r.id,
        status: r.status,
        pickUpTime: r.pickUpTime,
        dropOffTime: r.dropOffTime,
        pickUpLocation: r.pickUpLocation,
        dropOffLocation: r.dropOffLocation,
        branchCode: r.car?.branch?.code || null,
        totalPrice: r.totalPrice,
        collected: r.payments.reduce((s, p) => s + p.amount, 0),
        dayCount: dayCount(r),
        extensionDays: r.extensions.reduce((s, e) => s + e.extraDays, 0),
        plate: r.car?.licensePlate || null,
        vehicle: r.car ? `${r.car.brand} ${r.car.model}` : "",
        customerName: r.corporate?.title || `${r.user.firstName} ${r.user.lastName}`.trim(),
      })),
      totalElements,
      page,
      size,
      sortField,
    })
  );
});

// Admin-created contract: minimal draft, admin fills in the rest on the detail
// page. Optionally started from a reservation (`reservationId`).
const createContract = asyncHandler(async (req, res) => {
  const { carId, userId, pickUpTime, dropOffTime, pickUpLocation, dropOffLocation, reservationId } = req.body;

  if (!carId || !userId) throw new HttpError(400, "carId and userId are required.");

  const parsedPickUp = parseFrontendDateTime(pickUpTime);
  const parsedDropOff = parseFrontendDateTime(dropOffTime);
  if (!parsedPickUp || !parsedDropOff || parsedDropOff <= parsedPickUp) {
    throw new HttpError(400, "Invalid pick-up/drop-off time range.");
  }

  const [car, user] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: carId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);
  if (!car) throw new HttpError(404, "Vehicle not found.");
  if (!user) throw new HttpError(404, "Customer not found.");

  const contract = await prisma.contract.create({
    data: {
      carId,
      userId,
      pickUpLocation: pickUpLocation || "",
      dropOffLocation: dropOffLocation || pickUpLocation || "",
      pickUpTime: parsedPickUp,
      dropOffTime: parsedDropOff,
      totalPrice: 0,
      status: "CREATED",
      reservationId: reservationId || null,
    },
  });
  res.status(201).json({ id: contract.id });
});

// Vehicles free for [pickUpTime, dropOffTime): no overlapping non-cancelled
// contract or pending/confirmed reservation, and not out of service. Feeds the
// contract + reservation vehicle pickers.
const getAvailableCarsAdmin = asyncHandler(async (req, res) => {
  const { pickUpTime, dropOffTime, excludeContractId, excludeReservationId } = req.query;
  const pickUp = parseFrontendDateTime(pickUpTime);
  const dropOff = parseFrontendDateTime(dropOffTime);
  if (!pickUp || !dropOff || dropOff <= pickUp) {
    throw new HttpError(400, "Invalid pick-up/drop-off time range.");
  }

  const window = { pickUpTime: { lt: dropOff }, dropOffTime: { gt: pickUp } };
  const [contractBusy, reservationBusy] = await Promise.all([
    prisma.contract.findMany({
      where: {
        status: { not: "CANCELLED" },
        id: excludeContractId ? { not: excludeContractId } : undefined,
        ...window,
      },
      select: { carId: true },
    }),
    prisma.reservation.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        ...window,
      },
      select: { carId: true },
    }),
  ]);
  const busy = new Set([...contractBusy, ...reservationBusy].map((r) => r.carId));

  const cars = await prisma.vehicle.findMany({
    where: { outOfService: false },
    orderBy: [{ brand: "asc" }, { model: "asc" }],
    include: { images: { orderBy: { createdAt: "asc" } }, branch: true },
  });

  res.json(cars.filter((car) => !busy.has(car.id)).map(serializeVehicle));
});

const deleteContract = asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) throw new HttpError(404, "Contract not found.");

  await prisma.contract.delete({ where: { id: contract.id } });
  res.json({ message: "Contract deleted." });
});

// Admin dashboard "Returns"/"Departures" tables: contracts whose drop-off
// (returns) or pick-up (departures) falls within a day window from now.
// Always excludes CANCELLED; optionally excludes DONE too.
const getAdminSchedule = asyncHandler(async (req, res) => {
  const { type = "returns", window = "7", excludeCompleted, branchId } = req.query;
  const dateField = type === "departures" ? "pickUpTime" : "dropOffTime";
  const { from, to } = resolveWindow(window);

  const contracts = await prisma.contract.findMany({
    where: {
      [dateField]: { gte: from, lte: to },
      status: excludeCompleted === "true" ? { notIn: ["CANCELLED", "DONE"] } : { not: "CANCELLED" },
      ...(branchId ? { car: { branchId } } : {}),
    },
    orderBy: { [dateField]: "asc" },
    include: { car: { include: { branch: true } }, user: true },
  });

  res.json(contracts.map(serializeScheduleRow));
});

module.exports = {
  getContractsByPage,
  createContract,
  getAvailableCarsAdmin,
  deleteContract,
  getAdminSchedule,
};
