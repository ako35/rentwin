const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");

// Public list feeding every pick-up/drop-off location field (homepage search,
// booking form, admin contract form) — no auth needed to read it.
const getLocations = asyncHandler(async (req, res) => {
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
  res.json(locations);
});

const createLocation = asyncHandler(async (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) throw new HttpError(400, "Name is required.");

  const location = await prisma.location.create({ data: { name } });
  res.status(201).json(location);
});

const deleteLocation = asyncHandler(async (req, res) => {
  const target = await prisma.location.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Location not found.");

  await prisma.location.delete({ where: { id: target.id } });
  res.json({ message: "Location deleted." });
});

module.exports = { getLocations, createLocation, deleteLocation };
