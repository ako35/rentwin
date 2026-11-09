const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { uploadImage, deleteImage } = require("../../lib/storage");
const { pickWidth, renderVariant } = require("../../lib/image-variants");
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

// An id here can be a per-vehicle VehicleImage or a make+model VehicleModelImage
// — serializeVehicle may return either. Both carry a public `blobUrl`.
// Without `?w=` (or with a width outside DISPLAY_WIDTHS) this redirects to the
// original, as it always has. With one, it answers with a resized WebP that
// the browser and the Vercel CDN keep for a year: an image id never changes
// content (a re-upload creates a new id). Any failure falls back to the
// original so an image never breaks because of the resize.
const display = asyncHandler(async (req, res) => {
  const image =
    (await prisma.vehicleImage.findUnique({ where: { id: req.params.id } })) ||
    (await prisma.vehicleModelImage.findUnique({ where: { id: req.params.id } }));
  if (!image) throw new HttpError(404, "Image not found.");

  const width = pickWidth(req.query.w);
  if (!width) return res.redirect(302, image.blobUrl);

  try {
    const upstream = await fetch(image.blobUrl);
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const output = await renderVariant(Buffer.from(await upstream.arrayBuffer()), width);
    res.set("Content-Type", "image/webp");
    res.set("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    return res.send(output);
  } catch (err) {
    return res.redirect(302, image.blobUrl);
  }
});

module.exports = { upload, remove, display };
