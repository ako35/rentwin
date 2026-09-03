const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { hoursBetween, round2 } = require("../../lib/dates");

// Generic CRUD for records that hang off a contract (drivers / payments / extras).
// URL segment -> Prisma model + accepted payload shape.
const RESOURCES = {
  drivers: {
    model: "contractDriver",
    fields: ["firstName", "lastName", "licenseNo", "licenseDate", "birthDate", "phone"],
    required: ["firstName", "lastName"],
    dateFields: ["licenseDate", "birthDate"],
    numberFields: [],
    orderBy: [{ createdAt: "asc" }],
  },
  payments: {
    model: "contractPayment",
    fields: ["amount", "method", "paidAt", "note"],
    required: ["amount"],
    dateFields: ["paidAt"],
    numberFields: ["amount"],
    orderBy: [{ paidAt: "desc" }],
  },
  extras: {
    model: "contractExtra",
    fields: ["name", "unitPrice", "perDay", "quantity"],
    required: ["name"],
    dateFields: [],
    numberFields: ["unitPrice", "quantity"],
    boolFields: ["perDay"],
    orderBy: [{ createdAt: "asc" }],
    // After any change, cache the summed line totals on Contract.extrasTotal.
    recomputeExtrasTotal: true,
  },
};

// billable days for the contract; matches contract-fields.computeTotal.
const contractDays = (contract) =>
  Math.max(1, Math.ceil(hoursBetween(contract.pickUpTime, contract.dropOffTime) / 24));

const syncExtrasTotal = async (contractId) => {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { id: true, pickUpTime: true, dropOffTime: true },
  });
  if (!contract) return;
  const rows = await prisma.contractExtra.findMany({ where: { contractId } });
  const days = contractDays(contract);
  const total = rows.reduce(
    (sum, r) => sum + r.unitPrice * r.quantity * (r.perDay ? days : 1),
    0
  );
  await prisma.contract
    .update({ where: { id: contractId }, data: { extrasTotal: round2(total) } })
    .catch(() => {});
};

const getResource = (name) => {
  const resource = RESOURCES[name];
  if (!resource) throw new HttpError(404, "Unknown contract record type.");
  return resource;
};

const isBlank = (v) => v === undefined || v === null || v === "";

const buildData = (resource, body, { partial } = {}) => {
  const data = {};
  const boolFields = resource.boolFields || [];
  resource.fields.forEach((field) => {
    if (partial && !(field in body)) return;
    const raw = body[field];
    if (boolFields.includes(field)) {
      data[field] = Boolean(raw);
    } else if (resource.dateFields.includes(field)) {
      data[field] = isBlank(raw) ? null : new Date(raw);
    } else if (resource.numberFields.includes(field)) {
      data[field] = isBlank(raw) ? (field === "quantity" ? 1 : 0) : Number(raw);
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

const ensureContract = async (contractId) => {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { id: true },
  });
  if (!contract) throw new HttpError(404, "Contract not found.");
};

const listRecords = asyncHandler(async (req, res) => {
  const resource = getResource(req.params.resource);
  await ensureContract(req.params.contractId);
  const records = await prisma[resource.model].findMany({
    where: { contractId: req.params.contractId },
    orderBy: resource.orderBy,
  });
  res.json(records);
});

const createRecord = asyncHandler(async (req, res) => {
  const resource = getResource(req.params.resource);
  await ensureContract(req.params.contractId);
  const record = await prisma[resource.model].create({
    data: { ...buildData(resource, req.body), contractId: req.params.contractId },
  });
  if (resource.recomputeExtrasTotal) await syncExtrasTotal(req.params.contractId);
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
  if (resource.recomputeExtrasTotal) await syncExtrasTotal(target.contractId);
  res.json(record);
});

const deleteRecord = asyncHandler(async (req, res) => {
  const resource = getResource(req.params.resource);
  const target = await prisma[resource.model].findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Record not found.");
  await prisma[resource.model].delete({ where: { id: req.params.id } });
  if (resource.recomputeExtrasTotal) await syncExtrasTotal(target.contractId);
  res.json({ message: "Record deleted." });
});

module.exports = { listRecords, createRecord, updateRecord, deleteRecord };
