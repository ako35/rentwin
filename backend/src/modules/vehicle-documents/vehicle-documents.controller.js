const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { uploadImage, deleteImage } = require("../../lib/storage");

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

module.exports = { listDocuments, uploadDocument, deleteDocument };
