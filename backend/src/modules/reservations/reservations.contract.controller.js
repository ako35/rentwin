const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parseFrontendDateTime, hoursBetween, round2 } = require("../../lib/dates");
const { checkAvailability } = require("../../lib/availability");
const { serializeReservation } = require("../../lib/serializers");
const asyncHandler = require("../../middleware/async-handler");
const { CAR_INCLUDE } = require("./reservations.shared");
const { num, pickContractFields, computeTotal } = require("./contract-fields");

// The contract detail screen's write paths: patch the contract, read it back
// in full, extend the drop-off, and issue the invoice.

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
      referenceUser: { select: { id: true, firstName: true, lastName: true, companyTitle: true, customerType: true } },
      corporate: true,
      extensions: { orderBy: { createdAt: "desc" } },
      invoice: true,
    },
  });
  if (!reservation) throw new HttpError(404, "Reservation not found.");

  const { user, referenceUser, ...rest } = reservation;
  res.json({
    ...serializeReservation(rest),
    carId: reservation.carId,
    userId: reservation.userId,
    customer: user,
    referenceUserId: reservation.referenceUserId,
    referenceUser: referenceUser || null,
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

module.exports = {
  updateReservationAdmin,
  getReservationByIdAdmin,
  extendReservation,
  createInvoice,
};
