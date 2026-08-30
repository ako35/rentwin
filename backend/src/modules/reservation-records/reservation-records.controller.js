const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");

// Generic CRUD for records that hang off a reservation (contract).
// URL segment -> Prisma model + accepted payload shape.
const RESOURCES = {
  drivers: {
    model: "reservationDriver",
    fields: ["firstName", "lastName", "licenseNo", "licenseDate", "birthDate", "phone"],
    required: ["firstName", "lastName"],
    dateFields: ["licenseDate", "birthDate"],
    numberFields: [],
    orderBy: [{ createdAt: "asc" }],
  },
  payments: {
    model: "reservationPayment",
    fields: ["amount", "method", "paidAt", "note"],
    required: ["amount"],
    dateFields: ["paidAt"],
    numberFields: ["amount"],
    orderBy: [{ paidAt: "desc" }],
  },
};

const getResource = (name) => {
  const resource = RESOURCES[name];
  if (!resource) throw new HttpError(404, "Unknown reservation record type.");
  return resource;
};

const isBlank = (v) => v === undefined || v === null || v === "";

const buildData = (resource, body, { partial } = {}) => {
  const data = {};
  resource.fields.forEach((field) => {
    if (partial && !(field in body)) return;
    const raw = body[field];
    if (resource.dateFields.includes(field)) {
      data[field] = isBlank(raw) ? null : new Date(raw);
    } else if (resource.numberFields.includes(field)) {
      data[field] = isBlank(raw) ? null : Number(raw);
    } else {
      data[field] = isBlank(raw) ? null : raw;
    }
  });
  if (!partial) {
    const missing = resource.required.filter((field) => isBlank(data[field]));
    if (missing.length) throw new HttpError(400, `Missing required field(s): ${missing.join(", ")}.`);
  }
  resource.numberFields.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null && Number.isNaN(data[field])) {
      throw new HttpError(400, `Field "${field}" must be a number.`);
    }
  });
  return data;
};

const ensureReservation = async (reservationId) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true },
  });
  if (!reservation) throw new HttpError(404, "Reservation not found.");
};

const listRecords = asyncHandler(async (req, res) => {
  const resource = getResource(req.params.resource);
  await ensureReservation(req.params.reservationId);
  const records = await prisma[resource.model].findMany({
    where: { reservationId: req.params.reservationId },
    orderBy: resource.orderBy,
  });
  res.json(records);
});

const createRecord = asyncHandler(async (req, res) => {
  const resource = getResource(req.params.resource);
  await ensureReservation(req.params.reservationId);
  const record = await prisma[resource.model].create({
    data: { ...buildData(resource, req.body), reservationId: req.params.reservationId },
  });
  res.status(201).json(record);
});

const updateRecord = asyncHandler(async (req, res) => {
  const resource = getResource(req.params.resource);
  const target = await prisma[resource.model].findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Record not found.");
  const record = await prisma[resource.model].update({
    where: { id: req.params.id },
    data: buildData(resource, req.body, { partial: true }),
  });
  res.json(record);
});

const deleteRecord = asyncHandler(async (req, res) => {
  const resource = getResource(req.params.resource);
  const target = await prisma[resource.model].findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Record not found.");
  await prisma[resource.model].delete({ where: { id: req.params.id } });
  res.json({ message: "Record deleted." });
});

module.exports = { listRecords, createRecord, updateRecord, deleteRecord };
