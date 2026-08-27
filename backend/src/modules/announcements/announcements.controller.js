const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");

const getActiveAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await prisma.announcement.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(announcements);
});

const getAllAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  res.json(announcements);
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, body, active } = req.body;
  if (!title || !body) throw new HttpError(400, "Title and body are required.");

  const announcement = await prisma.announcement.create({
    data: { title, body, active: active ?? true },
  });
  res.status(201).json(announcement);
});

const updateAnnouncement = asyncHandler(async (req, res) => {
  const { title, body, active } = req.body;

  const target = await prisma.announcement.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Announcement not found.");

  const announcement = await prisma.announcement.update({
    where: { id: target.id },
    data: { title, body, active },
  });
  res.json(announcement);
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const target = await prisma.announcement.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Announcement not found.");

  await prisma.announcement.delete({ where: { id: target.id } });
  res.json({ message: "Announcement deleted." });
});

module.exports = {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
