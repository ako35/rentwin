const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parseFrontendDateTime, resolveWindow, hoursBetween, round2 } = require("../../lib/dates");
const { checkAvailability } = require("../../lib/availability");
const { serializeReservation, serializeScheduleRow } = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");

const ALLOWED_SORT_FIELDS = ["id", "pickUpTime", "dropOffTime", "status"];
const CAR_INCLUDE = { car: { include: { images: { orderBy: { createdAt: "asc" } } } } };

const isAdmin = (user) => user.roles?.includes("Administrator");

const createReservation = asyncHandler(async (req, res) => {
  const { carId } = req.query;
  const { pickUpTime, dropOffTime, pickUpLocation, dropOffLocation } = req.body;

  const parsedPickUp = parseFrontendDateTime(pickUpTime);
  const parsedDropOff = parseFrontendDateTime(dropOffTime);

  const { available, totalPrice } = await checkAvailability(carId, parsedPickUp, parsedDropOff);
  if (!available) {
    throw new HttpError(409, "This vehicle is not available for the selected dates.");
  }

  const reservation = await prisma.reservation.create({
    data: {
      pickUpLocation,
      dropOffLocation,
      pickUpTime: parsedPickUp,
      dropOffTime: parsedDropOff,
      totalPrice,
      status: "CREATED",
      userId: req.user.id,
      carId,
    },
    include: CAR_INCLUDE,
  });

  res.status(201).json(serializeReservation(reservation));
});

const getReservationById = asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: CAR_INCLUDE,
  });
  if (!reservation) throw new HttpError(404, "Reservation not found.");
  if (reservation.userId !== req.user.id && !isAdmin(req.user)) {
    throw new HttpError(403, "You do not have access to this reservation.");
  }

  res.json(serializeReservation(reservation));
});

const getMyReservationsByPage = asyncHandler(async (req, res) => {
  const { page, size, direction, sortField } = parsePageParams(req.query, {
    defaultSize: 20,
    allowedSortFields: ALLOWED_SORT_FIELDS,
  });

  const where = { userId: req.user.id };

  const [content, totalElements] = await Promise.all([
    prisma.reservation.findMany({
      where,
      skip: page * size,
      take: size,
      orderBy: { [sortField]: direction },
      include: CAR_INCLUDE,
    }),
    prisma.reservation.count({ where }),
  ]);

  res.json(
    buildPageResponse({
      content: content.map(serializeReservation),
      totalElements,
      page,
      size,
      sortField,
    })
  );
});

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

const checkVehicleAvailability = asyncHandler(async (req, res) => {
  const { carId, pickUpDateTime, dropOffDateTime } = req.query;

  const { available, totalPrice } = await checkAvailability(
    carId,
    parseFrontendDateTime(pickUpDateTime),
    parseFrontendDateTime(dropOffDateTime)
  );

  res.json({ available, totalPrice });
});

const deleteReservationAdmin = asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
  if (!reservation) throw new HttpError(404, "Reservation not found.");

  await prisma.reservation.delete({ where: { id: reservation.id } });
  res.json({ message: "Reservation deleted." });
});

const CONTRACT_NOTE_FIELDS = ["customerNote", "adminNote", "referenceNo", "flightNo"];
const CONTRACT_NUMBER_FIELDS = [
  "dailyPrice",
  "extrasTotal",
  "oneWayFee",
  "returnExtraAmount",
  "discount",
  "deposit",
  "kmLimit",
  "vatRate",
];

const num = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const pickContractFields = (body) => {
  const data = {};
  CONTRACT_NOTE_FIELDS.forEach((field) => {
    if (field in body) data[field] = body[field] === "" ? null : body[field];
  });
  CONTRACT_NUMBER_FIELDS.forEach((field) => {
    if (field in body) data[field] = num(body[field]);
  });
  if ("unlimitedKm" in body) data.unlimitedKm = Boolean(body.unlimitedKm);
  if ("discountIsPercent" in body) data.discountIsPercent = Boolean(body.discountIsPercent);
  if ("discountDailyOnly" in body) data.discountDailyOnly = Boolean(body.discountDailyOnly);
  if ("corporateId" in body) data.corporateId = body.corporateId || null;
  return data;
};

// Contract grand total: (daily price x rental days + extras + one-way + return extras)
// minus discount (flat or %, optionally applied only to the rental part), plus VAT.
const computeTotal = (r, pickUp, dropOff) => {
  const days = Math.max(1, Math.ceil(hoursBetween(pickUp, dropOff) / 24));
  const rental = (num(r.dailyPrice) || 0) * days;
  const addOns = (num(r.extrasTotal) || 0) + (num(r.oneWayFee) || 0) + (num(r.returnExtraAmount) || 0);
  const discountBase = r.discountDailyOnly ? rental : rental + addOns;
  const discount = r.discountIsPercent
    ? (discountBase * (num(r.discount) || 0)) / 100
    : num(r.discount) || 0;
  const subtotal = rental + addOns - discount;
  const rate = num(r.vatRate);
  return round2(subtotal * (1 + (rate === null ? 20 : rate) / 100));
};

const updateReservationAdmin = asyncHandler(async (req, res) => {
  const { carId, reservationId } = req.query;
  const { pickUpTime, dropOffTime, pickUpLocation, dropOffLocation, status } = req.body;

  const existing = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!existing) throw new HttpError(404, "Reservation not found.");

  const parsedPickUp = parseFrontendDateTime(pickUpTime);
  const parsedDropOff = parseFrontendDateTime(dropOffTime);
  const targetCarId = carId || existing.carId;

  // Validates the date range and that the vehicle exists.
  await checkAvailability(targetCarId, parsedPickUp, parsedDropOff, {
    excludeReservationId: existing.id,
  });

  const contractFields = pickContractFields(req.body);
  const totalPrice = computeTotal({ ...existing, ...contractFields }, parsedPickUp, parsedDropOff);

  const reservation = await prisma.reservation.update({
    where: { id: existing.id },
    data: {
      carId: targetCarId,
      pickUpLocation,
      dropOffLocation,
      pickUpTime: parsedPickUp,
      dropOffTime: parsedDropOff,
      status,
      totalPrice,
      ...contractFields,
    },
    include: CAR_INCLUDE,
  });

  res.json(serializeReservation(reservation));
});

const getReservationByIdAdmin = asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: {
      ...CAR_INCLUDE,
      user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
      corporate: true,
      extensions: { orderBy: { createdAt: "desc" } },
      invoice: true,
    },
  });
  if (!reservation) throw new HttpError(404, "Reservation not found.");

  const { user, ...rest } = reservation;
  res.json({
    ...serializeReservation(rest),
    carId: reservation.carId,
    userId: reservation.userId,
    customer: user,
  });
});

const extendReservation = asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
  if (!reservation) throw new HttpError(404, "Reservation not found.");

  const newDropOff = parseFrontendDateTime(req.body.newDropOff);
  if (!newDropOff || newDropOff <= reservation.dropOffTime) {
    throw new HttpError(400, "New drop-off must be after the current drop-off.");
  }

  const extraDays = Math.max(1, Math.ceil(hoursBetween(reservation.dropOffTime, newDropOff) / 24));
  const extraAmount =
    num(req.body.extraAmount) ?? round2((num(reservation.dailyPrice) || 0) * extraDays);

  await prisma.reservationExtension.create({
    data: {
      reservationId: reservation.id,
      previousDropOff: reservation.dropOffTime,
      newDropOff,
      extraDays,
      extraAmount,
      note: req.body.note || null,
    },
  });

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      dropOffTime: newDropOff,
      totalPrice: computeTotal(reservation, reservation.pickUpTime, newDropOff),
    },
    include: CAR_INCLUDE,
  });
  res.json(serializeReservation(updated));
});

const createInvoice = asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: {
      corporate: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!reservation) throw new HttpError(404, "Reservation not found.");

  const existing = await prisma.invoice.findUnique({ where: { reservationId: reservation.id } });
  if (existing) throw new HttpError(409, "Invoice already exists for this contract.");

  const year = new Date().getFullYear();
  const countThisYear = await prisma.invoice.count({
    where: { createdAt: { gte: new Date(`${year}-01-01T00:00:00Z`) } },
  });
  const number = `RW-${year}-${String(countThisYear + 1).padStart(5, "0")}`;

  const gross = round2(reservation.totalPrice || 0);
  const rate = reservation.vatRate ?? 20;
  const net = round2(gross / (1 + rate / 100));
  const tax = round2(gross - net);

  const invoice = await prisma.invoice.create({
    data: {
      reservationId: reservation.id,
      number,
      netAmount: net,
      taxAmount: tax,
      grossAmount: gross,
      customerTitle:
        reservation.corporate?.title ||
        `${reservation.user.firstName} ${reservation.user.lastName}`.trim(),
      taxNo: reservation.corporate?.taxNo || null,
      note: req.body.note || null,
    },
  });
  res.status(201).json(invoice);
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
  createReservation,
  createReservationAdmin,
  getReservationById,
  getMyReservationsByPage,
  getReservationsByPageAdmin,
  checkVehicleAvailability,
  deleteReservationAdmin,
  updateReservationAdmin,
  getReservationByIdAdmin,
  extendReservation,
  createInvoice,
  getAdminSchedule,
};
