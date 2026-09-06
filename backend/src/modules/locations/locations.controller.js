const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { deleteImage } = require("../../lib/blob");
const asyncHandler = require("../../middleware/async-handler");

// Drop the blob + orphan VehicleImage row an image id points at.
const removeImage = async (imageId) => {
  const image = await prisma.vehicleImage.findUnique({ where: { id: imageId } });
  if (!image) return;
  try {
    await deleteImage(image.pathname);
  } catch (err) {
    // blob already gone — still drop the row
  }
  await prisma.vehicleImage.delete({ where: { id: image.id } });
};

// Public list feeding every pick-up/drop-off location field (homepage search,
// booking form, admin contract form) plus the public location landing pages —
// no auth needed to read it.
const getLocations = asyncHandler(async (req, res) => {
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
  res.json(locations);
});

const createLocation = asyncHandler(async (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) throw new HttpError(400, "Name is required.");

  const location = await prisma.location.create({
    data: { name, imageId: req.body.imageId || null },
  });
  res.status(201).json(location);
});

const updateLocation = asyncHandler(async (req, res) => {
  const target = await prisma.location.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Location not found.");

  const data = {};
  if (typeof req.body.name === "string") {
    const name = req.body.name.trim();
    if (!name) throw new HttpError(400, "Name is required.");
    data.name = name;
  }
  if ("imageId" in req.body) {
    data.imageId = req.body.imageId || null;
    if (target.imageId && target.imageId !== data.imageId) await removeImage(target.imageId);
  }

  const location = await prisma.location.update({ where: { id: target.id }, data });
  res.json(location);
});

const deleteLocation = asyncHandler(async (req, res) => {
  const target = await prisma.location.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Location not found.");

  await prisma.location.delete({ where: { id: target.id } });
  if (target.imageId) await removeImage(target.imageId);
  res.json({ message: "Location deleted." });
});

module.exports = { getLocations, createLocation, updateLocation, deleteLocation };
