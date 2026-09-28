const { randomUUID } = require("crypto");
const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { deleteImage, getUploadUrl } = require("../../lib/storage");

// Kept as literal lists (not read off the Prisma client) — same pattern as
// vehicle-documents.controller's RESOURCE_LINKS map — so a bad value from a
// client is a normal 400, not a Prisma enum-cast error.
const STAGES = ["PICKUP", "RETURN"];
const ANGLES = ["FRONT", "BACK", "LEFT", "RIGHT", "DASHBOARD", "DAMAGE", "OTHER"];

const assertStageAngle = (stage, angle) => {
  if (!STAGES.includes(stage)) throw new HttpError(400, "Geçersiz aşama (stage).");
  if (!ANGLES.includes(angle)) throw new HttpError(400, "Geçersiz açı (angle).");
};

const findContract = async (contractId) => {
  const contract = await prisma.contract.findUnique({ where: { id: contractId }, select: { id: true } });
  if (!contract) throw new HttpError(404, "Contract not found.");
  return contract;
};

// Mobile app step 1: ask for a short-lived R2 PUT URL, upload the photo bytes
// straight there (never through this backend), then call confirmUpload below.
const requestUpload = asyncHandler(async (req, res) => {
  const contractId = req.params.id;
  const { stage, angle, mimeType } = req.body;
  assertStageAngle(stage, angle);
  if (!mimeType || !String(mimeType).startsWith("image/")) {
    throw new HttpError(400, "Geçersiz dosya türü.");
  }
  await findContract(contractId);

  const pathname = `contract-photos/${contractId}/${randomUUID()}.jpg`;
  const uploadUrl = await getUploadUrl(pathname, mimeType);
  const blobUrl = `${process.env.R2_PUBLIC_URL}/${pathname}`;
  res.json({ uploadUrl, pathname, blobUrl });
});

// Mobile app step 2, only called after the direct-to-R2 PUT above returned
// 200 — a DB row is never created for bytes that never actually landed.
const confirmUpload = asyncHandler(async (req, res) => {
  const contractId = req.params.id;
  const { stage, angle, pathname, blobUrl, mimeType, size } = req.body;
  assertStageAngle(stage, angle);
  if (!pathname || !pathname.startsWith(`contract-photos/${contractId}/`)) {
    throw new HttpError(400, "Geçersiz dosya anahtarı.");
  }
  if (!blobUrl) throw new HttpError(400, "blobUrl eksik.");
  await findContract(contractId);

  const photo = await prisma.contractPhoto.create({
    data: {
      contractId,
      stage,
      angle,
      pathname,
      blobUrl,
      mimeType: mimeType || null,
      size: size != null ? Number(size) : null,
      takenById: req.user.id,
    },
  });
  res.status(201).json(photo);
});

// Web admin gallery: everything shot for a contract, optionally filtered to
// one stage (Teslim/İade tabs).
const listPhotos = asyncHandler(async (req, res) => {
  const contractId = req.params.id;
  const { stage } = req.query;
  await findContract(contractId);

  const photos = await prisma.contractPhoto.findMany({
    where: { contractId, ...(stage ? { stage } : {}) },
    orderBy: [{ stage: "asc" }, { angle: "asc" }, { createdAt: "asc" }],
    include: { takenBy: { select: { firstName: true, lastName: true } } },
  });
  res.json(photos);
});

const deletePhoto = asyncHandler(async (req, res) => {
  const photo = await prisma.contractPhoto.findUnique({ where: { id: req.params.id } });
  if (!photo) throw new HttpError(404, "Photo not found.");

  await deleteImage(photo.pathname).catch(() => {});
  await prisma.contractPhoto.delete({ where: { id: photo.id } });
  res.json({ message: "Photo deleted." });
});

module.exports = { requestUpload, confirmUpload, listPhotos, deletePhoto };
