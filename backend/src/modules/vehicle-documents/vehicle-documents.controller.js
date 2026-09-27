const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { uploadImage, deleteImage } = require("../../lib/storage");

// Maps the URL's :resource segment (shared with vehicle-records.controller.js)
// to the Prisma model that owns the record and the VehicleDocument column that
// links back to it.
const RESOURCE_LINKS = {
  insurances: { model: "vehicleInsurance", field: "insuranceId" },
  taxes: { model: "vehicleTax", field: "taxId" },
  maintenances: { model: "vehicleMaintenance", field: "maintenanceId" },
  inspections: { model: "vehicleInspection", field: "inspectionId" },
};

const getResourceLink = (name) => {
  const link = RESOURCE_LINKS[name];
  if (!link) throw new HttpError(404, "Unknown vehicle record type.");
  return link;
};

const listDocuments = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
  if (!vehicle) throw new HttpError(404, "Vehicle not found.");

  const documents = await prisma.vehicleDocument.findMany({
    where: { vehicleId },
    orderBy: { createdAt: "desc" },
  });
  res.json(documents);
});

const uploadDocument = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;
  if (!req.file) throw new HttpError(400, "Dosya yüklenmedi.");

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
  if (!vehicle) throw new HttpError(404, "Vehicle not found.");

  const name = (req.body.name || "").trim() || req.file.originalname;
  const { blobUrl, pathname } = await uploadImage(req.file, "vehicle-documents");

  const document = await prisma.vehicleDocument.create({
    data: {
      vehicleId,
      name,
      blobUrl,
      pathname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
  });
  res.status(201).json(document);
});

const deleteDocument = asyncHandler(async (req, res) => {
  const document = await prisma.vehicleDocument.findUnique({ where: { id: req.params.id } });
  if (!document) throw new HttpError(404, "Document not found.");

  await deleteImage(document.pathname).catch(() => {});
  await prisma.vehicleDocument.delete({ where: { id: document.id } });
  res.json({ message: "Document deleted." });
});

// Documents attached to one specific insurance/tax/maintenance/inspection
// record (e.g. a policy scan) rather than the vehicle in general.
const listRecordDocuments = asyncHandler(async (req, res) => {
  const link = getResourceLink(req.params.resource);
  const { recordId } = req.params;

  const record = await prisma[link.model].findUnique({ where: { id: recordId }, select: { id: true } });
  if (!record) throw new HttpError(404, "Record not found.");

  const documents = await prisma.vehicleDocument.findMany({
    where: { [link.field]: recordId },
    orderBy: { createdAt: "desc" },
  });
  res.json(documents);
});

const uploadRecordDocument = asyncHandler(async (req, res) => {
  const link = getResourceLink(req.params.resource);
  const { recordId } = req.params;
  if (!req.file) throw new HttpError(400, "Dosya yüklenmedi.");

  const record = await prisma[link.model].findUnique({
    where: { id: recordId },
    select: { id: true, vehicleId: true },
  });
  if (!record) throw new HttpError(404, "Record not found.");

  const name = (req.body.name || "").trim() || req.file.originalname;
  const { blobUrl, pathname } = await uploadImage(req.file, "vehicle-documents");

  const document = await prisma.vehicleDocument.create({
    data: {
      vehicleId: record.vehicleId,
      [link.field]: recordId,
      name,
      blobUrl,
      pathname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
  });
  res.status(201).json(document);
});

module.exports = {
  listDocuments,
  uploadDocument,
  deleteDocument,
  listRecordDocuments,
  uploadRecordDocument,
};
