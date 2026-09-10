const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { deleteImage } = require("../../lib/blob");
const asyncHandler = require("../../middleware/async-handler");

const ORDER = [{ sortOrder: "asc" }, { createdAt: "desc" }];

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

const toDate = (value) => (value ? new Date(value) : null);

const buildData = (body) => ({
  title: (body.title || "").trim(),
  description: (body.description || "").trim(),
  imageId: body.imageId || null,
  ctaLabel: body.ctaLabel?.trim() || null,
  ctaUrl: body.ctaUrl?.trim() || null,
  startsAt: toDate(body.startsAt),
  endsAt: toDate(body.endsAt),
  active: body.active ?? true,
  sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
});

// Public — only active campaigns, in display order.
const getPublicCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await prisma.campaign.findMany({ where: { active: true }, orderBy: ORDER });
  res.json(campaigns);
});

// Admin — every campaign, active or not.
const getAllCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await prisma.campaign.findMany({ orderBy: ORDER });
  res.json(campaigns);
});

const createCampaign = asyncHandler(async (req, res) => {
  const data = buildData(req.body);
  if (!data.title || !data.description) {
    throw new HttpError(400, "Title and description are required.");
  }
  const campaign = await prisma.campaign.create({ data });
  res.status(201).json(campaign);
});

const updateCampaign = asyncHandler(async (req, res) => {
  const target = await prisma.campaign.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Campaign not found.");

  const data = buildData(req.body);
  if (!data.title || !data.description) {
    throw new HttpError(400, "Title and description are required.");
  }

  const campaign = await prisma.campaign.update({ where: { id: target.id }, data });
  if (target.imageId && target.imageId !== data.imageId) await removeImage(target.imageId);
  res.json(campaign);
});

const deleteCampaign = asyncHandler(async (req, res) => {
  const target = await prisma.campaign.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Campaign not found.");

  await prisma.campaign.delete({ where: { id: target.id } });
  if (target.imageId) await removeImage(target.imageId);
  res.json({ message: "Campaign deleted." });
});

module.exports = {
  getPublicCampaigns,
  getAllCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
};
