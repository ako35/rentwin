const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parseFrontendDateTime, resolveWindow } = require("../../lib/dates");
const { serializeScheduleRow, serializeVehicle } = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");
const { ALLOWED_SORT_FIELDS } = require("./reservations.shared");

const getReservationsByPageAdmin = asyncHandler(async (req, res) => {
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
    prisma.reservation.findMany({
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
    prisma.reservation.count({ where }),
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

// Admin-created contract: minimal draft, admin fills in the rest on the detail page.
const createReservationAdmin = asyncHandler(async (req, res) => {
  const { carId, userId, pickUpTime, dropOffTime, pickUpLocation, dropOffLocation } = req.body;

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

  const reservation = await prisma.reservation.create({
    data: {
      carId,
      userId,
      pickUpLocation: pickUpLocation || "",
      dropOffLocation: dropOffLocation || pickUpLocation || "",
      pickUpTime: parsedPickUp,
      dropOffTime: parsedDropOff,
      totalPrice: 0,
      status: "CREATED",
    },
  });
  res.status(201).json({ id: reservation.id });
});

// Vehicles free for [pickUpTime, dropOffTime): no overlapping non-CANCELLED
// reservation and not out of service. Feeds the contract screen's vehicle
// picker so admins only see cars they can actually book for the chosen dates.
const getAvailableCarsAdmin = asyncHandler(async (req, res) => {
  const { pickUpTime, dropOffTime, excludeReservationId } = req.query;
  const pickUp = parseFrontendDateTime(pickUpTime);
  const dropOff = parseFrontendDateTime(dropOffTime);
  if (!pickUp || !dropOff || dropOff <= pickUp) {
    throw new HttpError(400, "Invalid pick-up/drop-off time range.");
  }

  const overlapping = await prisma.reservation.findMany({
    where: {
      status: { not: "CANCELLED" },
      id: excludeReservationId ? { not: excludeReservationId } : undefined,
      pickUpTime: { lt: dropOff },
      dropOffTime: { gt: pickUp },
    },
    select: { carId: true },
  });
  const busy = new Set(overlapping.map((r) => r.carId));

  const cars = await prisma.vehicle.findMany({
    where: { outOfService: false },
    orderBy: [{ brand: "asc" }, { model: "asc" }],
    include: { images: { orderBy: { createdAt: "asc" } }, branch: true },
  });

  res.json(cars.filter((car) => !busy.has(car.id)).map(serializeVehicle));
});

const deleteReservationAdmin = asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
  if (!reservation) throw new HttpError(404, "Reservation not found.");

  await prisma.reservation.delete({ where: { id: reservation.id } });
  res.json({ message: "Reservation deleted." });
});


// Admin dashboard "Returns"/"Departures" tables: reservations whose
// drop-off (returns) or pick-up (departures) falls within a day window
// from now. Always excludes CANCELLED; optionally excludes DONE too.
const getAdminSchedule = asyncHandler(async (req, res) => {
  const { type = "returns", window = "7", excludeCompleted, branchId } = req.query;
  const dateField = type === "departures" ? "pickUpTime" : "dropOffTime";
  const { from, to } = resolveWindow(window);

  const statusFilter = { not: "CANCELLED" };

  const reservations = await prisma.reservation.findMany({
    where: {
      [dateField]: { gte: from, lte: to },
      status: excludeCompleted === "true" ? { notIn: ["CANCELLED", "DONE"] } : statusFilter,
      ...(branchId ? { car: { branchId } } : {}),
    },
    orderBy: { [dateField]: "asc" },
    include: { car: { include: { branch: true } }, user: true },
  });

  res.json(reservations.map(serializeScheduleRow));
});

module.exports = {
  getReservationsByPageAdmin,
  createReservationAdmin,
  getAvailableCarsAdmin,
  deleteReservationAdmin,
  getAdminSchedule,
};
