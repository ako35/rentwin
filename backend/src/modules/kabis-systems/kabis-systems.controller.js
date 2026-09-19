const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");

// Admin-managed list of KABİS portals — feeds the Ayarlar list and the
// contract screen's KABİS-system dropdown (see KbsSection.jsx).
const getKabisSystems = asyncHandler(async (req, res) => {
  const systems = await prisma.kabisSystem.findMany({ orderBy: { createdAt: "asc" } });
  res.json(systems);
});

const createKabisSystem = asyncHandler(async (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) throw new HttpError(400, "İsim girilmelidir.");

  const existing = await prisma.kabisSystem.findUnique({ where: { name } });
  if (existing) throw new HttpError(409, "Bu isimde bir KABİS sistemi zaten var.", "KABIS_SYSTEM_NAME_TAKEN");

  const system = await prisma.kabisSystem.create({ data: { name } });
  res.status(201).json(system);
});

const deleteKabisSystem = asyncHandler(async (req, res) => {
  const target = await prisma.kabisSystem.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "KABİS sistemi bulunamadı.");

  await prisma.kabisSystem.delete({ where: { id: target.id } });
  res.json({ message: "KABİS sistemi silindi." });
});

module.exports = { getKabisSystems, createKabisSystem, deleteKabisSystem };
