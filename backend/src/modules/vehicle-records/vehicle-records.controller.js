const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");

// One generic CRUD surface for the vehicle sub-records shown on the kolayCAR-style
// tabs (Sigorta/Kasko, MTV, Bakim/Tamir, Muayene/Egzoz). Each entry maps the URL
// segment to its Prisma model plus the shape of an accepted payload.
const RESOURCES = {
  insurances: {
    model: "vehicleInsurance",
    fields: ["type", "company", "policyNo", "startDate", "endDate", "premium", "notes"],
    required: ["type", "company", "policyNo", "startDate", "endDate"],
    dateFields: ["startDate", "endDate"],
    numberFields: ["premium"],
    orderBy: [{ endDate: "desc" }],
  },
  taxes: {
    model: "vehicleTax",
    fields: ["period", "installment", "amount", "dueDate", "paidDate", "notes"],
    required: ["period", "installment"],
    dateFields: ["dueDate", "paidDate"],
    numberFields: ["period", "installment", "amount"],
    orderBy: [{ period: "desc" }, { installment: "asc" }],
  },
  maintenances: {
    model: "vehicleMaintenance",
    fields: ["type", "date", "odometer", "vendor", "description", "cost", "nextDate", "nextOdometer"],
    required: ["date", "description"],
    dateFields: ["date", "nextDate"],
    numberFields: ["odometer", "cost", "nextOdometer"],
    orderBy: [{ date: "desc" }],
    // If the vehicle has a periodic km interval set but the operator didn't type a
    // "next service km" by hand, plan it automatically from this service's odometer.
    prepare: async (body, vehicleId) => {
      if (!isBlank(body.nextOdometer) || isBlank(body.odometer)) return body;
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: { maintenanceIntervalKm: true },
      });
      if (!vehicle?.maintenanceIntervalKm) return body;
      return { ...body, nextOdometer: Number(body.odometer) + vehicle.maintenanceIntervalKm };
    },
    // Keep the dashboard "Bakim" alert badge in sync with the latest planned service.
    sync: (record) => {
      const patch = {};
      if (record.nextDate) patch.nextMaintenanceDate = record.nextDate;
      if (record.nextOdometer != null) patch.nextMaintenanceKm = record.nextOdometer;
      return Object.keys(patch).length ? patch : null;
    },
  },
  inspections: {
    model: "vehicleInspection",
    fields: ["type", "date", "result", "expiryDate", "station", "cost", "notes"],
    required: ["date"],
    dateFields: ["date", "expiryDate"],
    numberFields: ["cost"],
    orderBy: [{ date: "desc" }],
    // Only the periodic roadworthiness check drives the "Muayene" alert badge.
    sync: (record) =>
      record.type === "Periodic" && record.expiryDate ? { nextInspectionDate: record.expiryDate } : null,
  },
};

const getResource = (name) => {
  const resource = RESOURCES[name];
  if (!resource) throw new HttpError(404, "Unknown vehicle record type.");
  return resource;
};

const isBlank = (value) => value === undefined || value === null || value === "";

const buildData = (resource, body, { partial } = {}) => {
  const data = {};

  resource.fields.forEach((field) => {
    if (partial && !(field in body)) return;

    const raw = body[field];

    if (resource.dateFields.includes(field)) {
      data[field] = isBlank(raw) ? null : new Date(raw);
      return;
    }
    if (resource.numberFields.includes(field)) {
      data[field] = isBlank(raw) ? null : Number(raw);
      return;
    }
    data[field] = isBlank(raw) ? null : raw;
  });

  if (!partial) {
    const missing = resource.required.filter((field) => isBlank(data[field]));
    if (missing.length) {
      throw new HttpError(400, `Missing required field(s): ${missing.join(", ")}.`);
    }
  }

  resource.numberFields.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null && Number.isNaN(data[field])) {
      throw new HttpError(400, `Field "${field}" must be a number.`);
    }
  });

  return data;
};

const applyVehicleSync = async (resource, record) => {
  if (!resource.sync) return;
  const patch = resource.sync(record);
  if (patch) {
    await prisma.vehicle.update({ where: { id: record.vehicleId }, data: patch }).catch(() => {});
  }
};

const listRecords = asyncHandler(async (req, res) => {
  const resource = getResource(req.params.resource);
  const { vehicleId } = req.params;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
  if (!vehicle) throw new HttpError(404, "Vehicle not found.");

  const records = await prisma[resource.model].findMany({
    where: { vehicleId },
    orderBy: resource.orderBy,
  });
  res.json(records);
});

const createRecord = asyncHandler(async (req, res) => {
  const resource = getResource(req.params.resource);
  const { vehicleId } = req.params;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
  if (!vehicle) throw new HttpError(404, "Vehicle not found.");

  const body = resource.prepare ? await resource.prepare(req.body, vehicleId) : req.body;
  const record = await prisma[resource.model].create({
    data: { ...buildData(resource, body), vehicleId },
  });
  await applyVehicleSync(resource, record);

  res.status(201).json(record);
});

const updateRecord = asyncHandler(async (req, res) => {
  const resource = getResource(req.params.resource);
  const { id } = req.params;

  const target = await prisma[resource.model].findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "Record not found.");

  const body = resource.prepare ? await resource.prepare(req.body, target.vehicleId) : req.body;
  const record = await prisma[resource.model].update({
    where: { id },
    data: buildData(resource, body, { partial: true }),
  });
  await applyVehicleSync(resource, record);

  res.json(record);
});

const deleteRecord = asyncHandler(async (req, res) => {
  const resource = getResource(req.params.resource);
  const { id } = req.params;

  const target = await prisma[resource.model].findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "Record not found.");

  await prisma[resource.model].delete({ where: { id } });
  res.json({ message: "Record deleted." });
});

module.exports = { listRecords, createRecord, updateRecord, deleteRecord };
