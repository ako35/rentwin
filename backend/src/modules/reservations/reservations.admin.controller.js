const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parseFrontendDateTime, resolveWindow } = require("../../lib/dates");
const { checkAvailability } = require("../../lib/availability");
const { serializeReservation, serializeScheduleRow } = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");
const { CAR_INCLUDE, ALLOWED_SORT_FIELDS } = require("./reservations.shared");
const { nextContractNo } = require("../contracts/contract-fields");

const dayCount = (r) =>
  Math.max(1, Math.ceil((r.dropOffTime.getTime() - r.pickUpTime.getTime()) / 86400000));

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
            { user: { firstName: { contains: customer, mode: "insensitive" } } },
            { user: { lastName: { contains: customer, mode: "insensitive" } } },
            { user: { companyTitle: { contains: customer, mode: "insensitive" } } },
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
        user: { select: { firstName: true, lastName: true, companyTitle: true } },
        contract: { select: { id: true } },
      },
    }),
    prisma.reservation.count({ where }),
  ]);

  res.json(
    buildPageResponse({
      content: content.map((r) => ({
        id: r.id,
        status: r.status,
        pickUpTime: r.pickUpTime,
        dropOffTime: r.dropOffTime,
        pickUpLocation: r.pickUpLocation,
        dropOffLocation: r.dropOffLocation,
        note: r.note,
        branchCode: r.car?.branch?.code || null,
        dayCount: dayCount(r),
        plate: r.car?.licensePlate || null,
        vehicle: r.car ? `${r.car.brand} ${r.car.model}` : "",
        customerName: (r.user.companyTitle || `${r.user.firstName} ${r.user.lastName}`).trim(),
        contractId: r.contract?.id || null,
      })),
      totalElements,
      page,
      size,
      sortField,
    })
  );
});

const getReservationByIdAdmin = asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: {
      ...CAR_INCLUDE,
      user: { select: { id: true, firstName: true, lastName: true, companyTitle: true, email: true, phoneNumber: true } },
      contract: { select: { id: true } },
    },
  });
  if (!reservation) throw new HttpError(404, "Reservation not found.");

  const { user, contract, ...rest } = reservation;
  res.json({
    ...serializeReservation(rest),
    carId: reservation.carId,
    userId: reservation.userId,
    customer: user,
    contractId: contract?.id || null,
  });
});

const validateBookingBody = (body) => {
  const { carId, userId } = body;
  if (!carId || !userId) throw new HttpError(400, "carId and userId are required.");
  const pickUp = parseFrontendDateTime(body.pickUpTime);
  const dropOff = parseFrontendDateTime(body.dropOffTime);
  if (!pickUp || !dropOff || dropOff <= pickUp) {
    throw new HttpError(400, "Invalid pick-up/drop-off time range.");
  }
  return { pickUp, dropOff };
};

const createReservationAdmin = asyncHandler(async (req, res) => {
  const { carId, userId, pickUpLocation, dropOffLocation, note } = req.body;
  const { pickUp, dropOff } = validateBookingBody(req.body);

  const { available } = await checkAvailability(carId, pickUp, dropOff);
  if (!available) throw new HttpError(409, "This vehicle is not available for the selected dates.");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new HttpError(404, "Customer not found.");

  const reservation = await prisma.reservation.create({
    data: {
      carId,
      userId,
      pickUpLocation: pickUpLocation || "",
      dropOffLocation: dropOffLocation || pickUpLocation || "",
      pickUpTime: pickUp,
      dropOffTime: dropOff,
      status: "CONFIRMED",
      note: note || null,
    },
    include: CAR_INCLUDE,
  });
  res.status(201).json(serializeReservation(reservation));
});

const updateReservationAdmin = asyncHandler(async (req, res) => {
  const existing = await prisma.reservation.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, "Reservation not found.");
  if (existing.status === "CONVERTED") throw new HttpError(409, "This reservation is already a contract.");

  const { carId, userId, pickUpLocation, dropOffLocation, note, status } = req.body;
  const { pickUp, dropOff } = validateBookingBody({ ...existing, ...req.body });

  const { available } = await checkAvailability(carId || existing.carId, pickUp, dropOff, {
    excludeReservationId: existing.id,
  });
  if (!available) throw new HttpError(409, "This vehicle is not available for the selected dates.");

  const reservation = await prisma.reservation.update({
    where: { id: existing.id },
    data: {
      carId: carId || existing.carId,
      userId: userId || existing.userId,
      pickUpLocation: pickUpLocation ?? existing.pickUpLocation,
      dropOffLocation: dropOffLocation ?? existing.dropOffLocation,
      pickUpTime: pickUp,
      dropOffTime: dropOff,
      note: note === undefined ? existing.note : note || null,
      status: status && ["PENDING", "CONFIRMED"].includes(status) ? status : existing.status,
    },
    include: CAR_INCLUDE,
  });
  res.json(serializeReservation(reservation));
});

const setReservationStatus = (status) =>
  asyncHandler(async (req, res) => {
    const existing = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Reservation not found.");
    if (existing.status === "CONVERTED") throw new HttpError(409, "This reservation is already a contract.");
    const reservation = await prisma.reservation.update({
      where: { id: existing.id },
      data: { status },
      include: CAR_INCLUDE,
    });
    res.json(serializeReservation(reservation));
  });

const confirmReservation = setReservationStatus("CONFIRMED");
const cancelReservation = setReservationStatus("CANCELLED");

// Turn a reservation into a full contract draft, link them, mark the
// reservation CONVERTED. The admin then fills in pricing on the contract screen.
const convertToContract = asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
  if (!reservation) throw new HttpError(404, "Reservation not found.");
  if (reservation.status === "CONVERTED") throw new HttpError(409, "This reservation is already a contract.");
  if (reservation.status === "CANCELLED") throw new HttpError(409, "Cannot convert a cancelled reservation.");

  const contract = await prisma.$transaction(async (tx) => {
    const created = await tx.contract.create({
      data: {
        carId: reservation.carId,
        userId: reservation.userId,
        contractNo: await nextContractNo(tx),
        pickUpLocation: reservation.pickUpLocation,
        dropOffLocation: reservation.dropOffLocation,
        pickUpTime: reservation.pickUpTime,
        dropOffTime: reservation.dropOffTime,
        totalPrice: 0,
        status: "CREATED",
        reservationId: reservation.id,
        adminNote: reservation.note || null,
      },
    });
    await tx.reservation.update({ where: { id: reservation.id }, data: { status: "CONVERTED" } });
    return created;
  });

  res.status(201).json({ contractId: contract.id });
});

// Admin dashboard "Çıkışlar": still-open reservations (PENDING / CONFIRMED)
// whose pick-up falls within a day window from now. Same row shape as the
// contract schedule so the dashboard table renders both the same way.
const getReservationSchedule = asyncHandler(async (req, res) => {
  const { window = "7", branchId } = req.query;
  const { from, to } = resolveWindow(window);

  const reservations = await prisma.reservation.findMany({
    where: {
      pickUpTime: { gte: from, lte: to },
      status: { in: ["PENDING", "CONFIRMED"] },
      ...(branchId ? { car: { branchId } } : {}),
    },
    orderBy: { pickUpTime: "asc" },
    include: { car: { include: { branch: true } }, user: true },
  });

  res.json(reservations.map(serializeScheduleRow));
});

module.exports = {
  getReservationsByPageAdmin,
  getReservationByIdAdmin,
  createReservationAdmin,
  updateReservationAdmin,
  confirmReservation,
  cancelReservation,
  convertToContract,
  getReservationSchedule,
};
