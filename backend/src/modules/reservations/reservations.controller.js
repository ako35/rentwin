const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parseFrontendDateTime } = require("../../lib/dates");
const { checkAvailability } = require("../../lib/availability");
const { serializeReservation } = require("../../lib/serializers");
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

const updateReservationAdmin = asyncHandler(async (req, res) => {
  const { carId, reservationId } = req.query;
  const { pickUpTime, dropOffTime, pickUpLocation, dropOffLocation, status } = req.body;

  const existing = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!existing) throw new HttpError(404, "Reservation not found.");

  const parsedPickUp = parseFrontendDateTime(pickUpTime);
  const parsedDropOff = parseFrontendDateTime(dropOffTime);
  const targetCarId = carId || existing.carId;

  const { totalPrice } = await checkAvailability(targetCarId, parsedPickUp, parsedDropOff, {
    excludeReservationId: existing.id,
  });

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
    },
    include: CAR_INCLUDE,
  });

  res.json(serializeReservation(reservation));
});

const getReservationByIdAdmin = asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: CAR_INCLUDE,
  });
  if (!reservation) throw new HttpError(404, "Reservation not found.");

  res.json({ ...serializeReservation(reservation), carId: reservation.carId, userId: reservation.userId });
});

module.exports = {
  createReservation,
  getReservationById,
  getMyReservationsByPage,
  checkVehicleAvailability,
  deleteReservationAdmin,
  updateReservationAdmin,
  getReservationByIdAdmin,
};
