const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { uploadImage, deleteImage } = require("../../lib/blob");
const asyncHandler = require("../../middleware/async-handler");

const upload = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new HttpError(400, "No file uploaded.");
  }

  const { blobUrl, pathname } = await uploadImage(req.file);

  const image = await prisma.vehicleImage.create({
    data: { blobUrl, pathname },
  });

  res.status(201).json({ imageId: image.id });
});

const remove = asyncHandler(async (req, res) => {
  const image = await prisma.vehicleImage.findUnique({ where: { id: req.params.id } });
  if (!image) throw new HttpError(404, "Image not found.");

  await deleteImage(image.pathname);
  await prisma.vehicleImage.delete({ where: { id: image.id } });

  res.json({ message: "Image deleted." });
});

const display = asyncHandler(async (req, res) => {
  const image = await prisma.vehicleImage.findUnique({ where: { id: req.params.id } });
  if (!image) throw new HttpError(404, "Image not found.");

  res.redirect(302, image.blobUrl);
});

module.exports = { upload, remove, display };
