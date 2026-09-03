const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parseFrontendDateTime, hoursBetween, round2 } = require("../../lib/dates");
const { checkAvailability } = require("../../lib/availability");
const { serializeContract } = require("../../lib/serializers");
const asyncHandler = require("../../middleware/async-handler");
const { CAR_INCLUDE } = require("./contracts.shared");
const { num, pickContractFields, computeTotal } = require("./contract-fields");

// The contract detail screen's write paths: patch the contract, read it back
// in full, extend the drop-off, and issue the invoice.

const updateContract = asyncHandler(async (req, res) => {
  const { carId, contractId } = req.query;
  const { pickUpTime, dropOffTime, pickUpLocation, dropOffLocation, status } = req.body;

  const existing = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!existing) throw new HttpError(404, "Contract not found.");

  const parsedPickUp = parseFrontendDateTime(pickUpTime);
  const parsedDropOff = parseFrontendDateTime(dropOffTime);
  const targetCarId = carId || existing.carId;

  // Validates the date range and that the vehicle exists.
  await checkAvailability(targetCarId, parsedPickUp, parsedDropOff, {
    excludeContractId: existing.id,
  });

  const contractFields = pickContractFields(req.body);
  const totalPrice = computeTotal({ ...existing, ...contractFields }, parsedPickUp, parsedDropOff);

  const contract = await prisma.contract.update({
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

  res.json(serializeContract(contract));
});

const getContractByIdAdmin = asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({
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
  if (!contract) throw new HttpError(404, "Contract not found.");

  const { user, referenceUser, ...rest } = contract;
  res.json({
    ...serializeContract(rest),
    carId: contract.carId,
    userId: contract.userId,
    customer: user,
    referenceUserId: contract.referenceUserId,
    referenceUser: referenceUser || null,
    reservationId: contract.reservationId,
  });
});

const extendContract = asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) throw new HttpError(404, "Contract not found.");

  const newDropOff = parseFrontendDateTime(req.body.newDropOff);
  if (!newDropOff || newDropOff <= contract.dropOffTime) {
    throw new HttpError(400, "New drop-off must be after the current drop-off.");
  }

  const extraDays = Math.max(1, Math.ceil(hoursBetween(contract.dropOffTime, newDropOff) / 24));
  const extraAmount =
    num(req.body.extraAmount) ?? round2((num(contract.dailyPrice) || 0) * extraDays);

  await prisma.contractExtension.create({
    data: {
      contractId: contract.id,
      previousDropOff: contract.dropOffTime,
      newDropOff,
      extraDays,
      extraAmount,
      note: req.body.note || null,
    },
  });

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: {
      dropOffTime: newDropOff,
      totalPrice: computeTotal(contract, contract.pickUpTime, newDropOff),
    },
    include: CAR_INCLUDE,
  });
  res.json(serializeContract(updated));
});

const createInvoice = asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: {
      corporate: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!contract) throw new HttpError(404, "Contract not found.");

  const existing = await prisma.invoice.findUnique({ where: { contractId: contract.id } });
  if (existing) throw new HttpError(409, "Invoice already exists for this contract.");

  const year = new Date().getFullYear();
  const countThisYear = await prisma.invoice.count({
    where: { createdAt: { gte: new Date(`${year}-01-01T00:00:00Z`) } },
  });
  const number = `RW-${year}-${String(countThisYear + 1).padStart(5, "0")}`;

  const gross = round2(contract.totalPrice || 0);
  const rate = contract.vatRate ?? 20;
  const net = round2(gross / (1 + rate / 100));
  const tax = round2(gross - net);

  const invoice = await prisma.invoice.create({
    data: {
      contractId: contract.id,
      number,
      netAmount: net,
      taxAmount: tax,
      grossAmount: gross,
      customerTitle:
        contract.corporate?.title ||
        `${contract.user.firstName} ${contract.user.lastName}`.trim(),
      taxNo: contract.corporate?.taxNo || null,
      note: req.body.note || null,
    },
  });
  res.status(201).json(invoice);
});

module.exports = {
  updateContract,
  getContractByIdAdmin,
  extendContract,
  createInvoice,
};
