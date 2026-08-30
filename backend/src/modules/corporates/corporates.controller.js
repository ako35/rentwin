const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");

const FIELDS = ["title", "taxOffice", "taxNo", "phone", "email", "note", "blacklisted"];

const pickFields = (body) =>
  FIELDS.reduce((data, field) => {
    if (!(field in body)) return data;
    if (field === "blacklisted") {
      data[field] = Boolean(body[field]);
    } else {
      const value = typeof body[field] === "string" ? body[field].trim() : body[field];
      data[field] = value === "" ? null : value;
    }
    return data;
  }, {});

const listCorporates = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { taxNo: { contains: q, mode: "insensitive" } },
        ],
      }
    : undefined;

  const corporates = await prisma.corporate.findMany({
    where,
    orderBy: { title: "asc" },
    take: 50,
  });
  res.json(corporates);
});

const getCorporate = asyncHandler(async (req, res) => {
  const corporate = await prisma.corporate.findUnique({ where: { id: req.params.id } });
  if (!corporate) throw new HttpError(404, "Corporate not found.");
  res.json(corporate);
});

const createCorporate = asyncHandler(async (req, res) => {
  const data = pickFields(req.body);
  if (!data.title) throw new HttpError(400, "Title is required.");

  const corporate = await prisma.corporate.create({ data });
  res.status(201).json(corporate);
});

const updateCorporate = asyncHandler(async (req, res) => {
  const target = await prisma.corporate.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Corporate not found.");

  const corporate = await prisma.corporate.update({
    where: { id: target.id },
    data: pickFields(req.body),
  });
  res.json(corporate);
});

const deleteCorporate = asyncHandler(async (req, res) => {
  const target = await prisma.corporate.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Corporate not found.");

  await prisma.corporate.delete({ where: { id: target.id } });
  res.json({ message: "Corporate deleted." });
});

module.exports = { listCorporates, getCorporate, createCorporate, updateCorporate, deleteCorporate };
