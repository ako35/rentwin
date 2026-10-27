const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { parseFrontendDateTime } = require("../../lib/dates");

const TYPES = new Set(["Periodic", "Emission"]);
const STATUSES = new Set(["SCHEDULED", "COMPLETED", "CANCELLED"]);
const vehicleSelect = { id: true, licensePlate: true, brand: true, model: true, branchId: true };

const parsePayload = (body, { partial = false } = {}) => {
  const data = {};
  if (!partial || "type" in body) {
    if (!TYPES.has(body.type)) throw new HttpError(400, "Invalid inspection appointment type.");
    data.type = body.type;
  }
  if (!partial || "appointmentAt" in body) {
    const appointmentAt = parseFrontendDateTime(body.appointmentAt);
    if (!appointmentAt) throw new HttpError(400, "A valid appointment date and time are required.");
    data.appointmentAt = appointmentAt;
  }
  for (const field of ["station", "bookingCode", "notes"]) {
    if (!partial || field in body) data[field] = String(body[field] || "").trim() || null;
  }
  if (!partial || "cost" in body) {
    if (body.cost === "" || body.cost == null) data.cost = null;
    else {
      const cost = Number(body.cost);
      if (!Number.isFinite(cost) || cost < 0) throw new HttpError(400, "Cost must be a non-negative number.");
      data.cost = cost;
    }
  }
  return data;
};

const listInspectionAppointments = asyncHandler(async (req, res) => {
  const where = {
    ...(req.query.branchId ? { vehicle: { branchId: req.query.branchId } } : {}),
    ...(STATUSES.has(req.query.status) ? { status: req.query.status } : {}),
  };
  const rows = await prisma.vehicleInspectionAppointment.findMany({
    where,
    include: { vehicle: { select: vehicleSelect } },
    orderBy: [{ appointmentAt: "asc" }, { createdAt: "desc" }],
  });
  res.json(rows);
});

const createInspectionAppointment = asyncHandler(async (req, res) => {
  const { vehicleId } = req.body;
  if (!vehicleId) throw new HttpError(400, "Vehicle is required.");
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
  if (!vehicle) throw new HttpError(404, "Vehicle not found.");

  const appointment = await prisma.vehicleInspectionAppointment.create({
    data: { vehicleId, ...parsePayload(req.body) },
    include: { vehicle: { select: vehicleSelect } },
  });
  res.status(201).json(appointment);
});

const updateInspectionAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const exists = await prisma.vehicleInspectionAppointment.findUnique({ where: { id: appointmentId }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Appointment not found.");

  const data = parsePayload(req.body, { partial: true });
  if ("status" in req.body) {
    if (!STATUSES.has(req.body.status)) throw new HttpError(400, "Invalid appointment status.");
    data.status = req.body.status;
    data.completedAt = req.body.status === "COMPLETED" ? new Date() : null;
  }
  const appointment = await prisma.vehicleInspectionAppointment.update({
    where: { id: appointmentId },
    data,
    include: { vehicle: { select: vehicleSelect } },
  });
  res.json(appointment);
});

module.exports = {
  listInspectionAppointments,
  createInspectionAppointment,
  updateInspectionAppointment,
};
