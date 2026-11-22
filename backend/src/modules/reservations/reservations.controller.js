const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parseFrontendDateTime, wallDayStart } = require("../../lib/dates");
const { checkAvailability } = require("../../lib/availability");
const { serializeCustomerReservation } = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");
const { CAR_INCLUDE, ALLOWED_SORT_FIELDS, isAdmin } = require("./reservations.shared");
const { loadModelImageMap } = require("../vehicles/vehicles.shared");

// Anyone can register, and a PENDING request holds its car exactly like a
// confirmed one (on the site and in the admin's contract form). These limits
// stop one account from taking the fleet off the market with far-off or
// months-long requests. Longer rentals are agreed with the office directly.
const MAX_PENDING_PER_CUSTOMER = 3;
const MAX_RENTAL_DAYS = 90;
const MAX_DAYS_AHEAD = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

const assertCustomerRequestAllowed = async (userId, pickUp, dropOff) => {
  if (!pickUp || !dropOff || dropOff <= pickUp) {
    throw new HttpError(400, "Geçersiz alış/bırakış tarihi.", "RESERVATION_INVALID_DATES");
  }
  const today = wallDayStart(0);
  if (pickUp < today) {
    throw new HttpError(400, "Alış tarihi geçmişte olamaz.", "RESERVATION_IN_PAST");
  }
  if (pickUp >= wallDayStart(MAX_DAYS_AHEAD)) {
    throw new HttpError(400, "Rezervasyon en fazla 1 yıl sonrası için yapılabilir.", "RESERVATION_TOO_FAR");
  }
  if (dropOff - pickUp > MAX_RENTAL_DAYS * DAY_MS) {
    throw new HttpError(400, "Online rezervasyon en fazla 90 gün olabilir.", "RESERVATION_TOO_LONG");
  }
  // Only upcoming requests count, so an old one nobody answered doesn't block
  // the customer forever.
  const pending = await prisma.reservation.count({
    where: { userId, status: "PENDING", pickUpTime: { gte: today } },
  });
  if (pending >= MAX_PENDING_PER_CUSTOMER) {
    throw new HttpError(409, "Onay bekleyen en fazla 3 rezervasyonunuz olabilir.", "RESERVATION_PENDING_LIMIT");
  }
};

// Customer-facing booking: hold a car for a date range. Starts PENDING; admin
// confirms or converts it to a contract.
const createReservation = asyncHandler(async (req, res) => {
  const { carId } = req.query;
  const { pickUpTime, dropOffTime, pickUpLocation, dropOffLocation, note } = req.body;

  if (typeof carId !== "string" || !carId) {
    throw new HttpError(400, "Araç seçilmedi.");
  }

  const parsedPickUp = parseFrontendDateTime(pickUpTime);
  const parsedDropOff = parseFrontendDateTime(dropOffTime);

  await assertCustomerRequestAllowed(req.user.id, parsedPickUp, parsedDropOff);

  const { available } = await checkAvailability(carId, parsedPickUp, parsedDropOff);
  if (!available) {
    throw new HttpError(409, "This vehicle is not available for the selected dates.");
  }

  const reservation = await prisma.reservation.create({
    data: {
      pickUpLocation,
      dropOffLocation,
      pickUpTime: parsedPickUp,
      dropOffTime: parsedDropOff,
      status: "PENDING",
      note: note ? String(note).slice(0, 1000) : null,
      userId: req.user.id,
      carId,
    },
    include: CAR_INCLUDE,
  });

  res.status(201).json(serializeCustomerReservation(reservation));
});

const getReservationById = asyncHandler(async (req, res) => {
  const [reservation, modelImageMap] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: CAR_INCLUDE,
    }),
    loadModelImageMap(),
  ]);
  if (!reservation) throw new HttpError(404, "Reservation not found.");
  if (reservation.userId !== req.user.id && !isAdmin(req.user)) {
    throw new HttpError(403, "You do not have access to this reservation.");
  }

  // Customer shape even for an admin caller — the admin screens (web + mobile)
  // read the full record from /reservations/admin/:id/auth instead.
  res.json(serializeCustomerReservation(reservation, modelImageMap));
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
      content: content.map((reservation) => serializeCustomerReservation(reservation)),
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

module.exports = {
  createReservation,
  getReservationById,
  getMyReservationsByPage,
  checkVehicleAvailability,
};
