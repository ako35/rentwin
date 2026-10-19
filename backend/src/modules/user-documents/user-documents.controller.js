const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { uploadImage, deleteImage } = require("../../lib/storage");

// Scanned customer documents (ehliyet/kimlik/pasaport, kaşe/vergi levhası) —
// same storage pattern as VehicleDocument (backend/src/modules/vehicle-documents),
// kept as a permanent, named, downloadable list per customer.
const listDocuments = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new HttpError(404, "User not found.");

  const documents = await prisma.userDocument.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  res.json(documents);
});

const uploadDocument = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!req.file) throw new HttpError(400, "Dosya yüklenmedi.");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new HttpError(404, "User not found.");

  const name = (req.body.name || "").trim() || req.file.originalname;
  const { blobUrl, pathname } = await uploadImage(req.file, "user-documents");

  const document = await prisma.userDocument.create({
    data: {
      userId,
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
  const document = await prisma.userDocument.findUnique({ where: { id: req.params.id } });
  if (!document) throw new HttpError(404, "Document not found.");

  await deleteImage(document.pathname).catch(() => {});
  await prisma.userDocument.delete({ where: { id: document.id } });
  res.json({ message: "Document deleted." });
});

module.exports = { listDocuments, uploadDocument, deleteDocument };
