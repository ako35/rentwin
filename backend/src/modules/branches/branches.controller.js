const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");

const getAllBranches = asyncHandler(async (req, res) => {
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { vehicles: true } } },
  });
  res.json(
    branches.map(({ _count, ...branch }) => ({ ...branch, vehicleCount: _count.vehicles }))
  );
});

const createBranch = asyncHandler(async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) throw new HttpError(400, "Name and code are required.");

  const branch = await prisma.branch.create({ data: { name, code } });
  res.status(201).json(branch);
});

const updateBranch = asyncHandler(async (req, res) => {
  const { name, code } = req.body;

  const target = await prisma.branch.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Branch not found.");

  const branch = await prisma.branch.update({
    where: { id: target.id },
    data: { name, code },
  });
  res.json(branch);
});

const deleteBranch = asyncHandler(async (req, res) => {
  const target = await prisma.branch.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Branch not found.");
  if (target.builtIn) throw new HttpError(403, "This branch cannot be deleted.");

  await prisma.branch.delete({ where: { id: target.id } });
  res.json({ message: "Branch deleted." });
});

module.exports = { getAllBranches, createBranch, updateBranch, deleteBranch };
