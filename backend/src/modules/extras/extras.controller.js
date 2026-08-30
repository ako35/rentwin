const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");

const pickFields = (body) => {
  const data = {};
  if ("name" in body) data.name = typeof body.name === "string" ? body.name.trim() : body.name;
  if ("unitPrice" in body) data.unitPrice = body.unitPrice === "" ? 0 : Number(body.unitPrice);
  if ("perDay" in body) data.perDay = Boolean(body.perDay);
  if ("active" in body) data.active = Boolean(body.active);
  return data;
};

const listExtras = asyncHandler(async (req, res) => {
  const { all } = req.query;
  const extras = await prisma.extra.findMany({
    where: all === "true" ? undefined : { active: true },
    orderBy: { name: "asc" },
  });
  res.json(extras);
});

const createExtra = asyncHandler(async (req, res) => {
  const data = pickFields(req.body);
  if (!data.name) throw new HttpError(400, "Name is required.");
  if (Number.isNaN(data.unitPrice)) throw new HttpError(400, "Unit price must be a number.");
  const extra = await prisma.extra.create({ data });
  res.status(201).json(extra);
});

const updateExtra = asyncHandler(async (req, res) => {
  const target = await prisma.extra.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Extra not found.");
  const extra = await prisma.extra.update({ where: { id: target.id }, data: pickFields(req.body) });
  res.json(extra);
});

const deleteExtra = asyncHandler(async (req, res) => {
  const target = await prisma.extra.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Extra not found.");
  await prisma.extra.delete({ where: { id: target.id } });
  res.json({ message: "Extra deleted." });
});

module.exports = { listExtras, createExtra, updateExtra, deleteExtra };
