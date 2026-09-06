const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");

// Public list used by the homepage reservation search (location suggestions).
// No vehicle counts, no auth.
const getPublicBranches = asyncHandler(async (req, res) => {
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
  res.json(branches);
});

const getAllBranches = asyncHandler(async (req, res) => {
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { vehicles: true } } },
  });
  res.json(
    branches.map(({ _count, ...branch }) => ({ ...branch, vehicleCount: _count.vehicles }))
  );
});

// Branch codes are assigned automatically — the next integer after the highest
// existing numeric code (non-numeric legacy codes are ignored for the max).
const nextBranchCode = async (client = prisma) => {
  const branches = await client.branch.findMany({ select: { code: true } });
  const max = branches.reduce((acc, b) => {
    const n = parseInt(b.code, 10);
    return Number.isInteger(n) && String(n) === String(b.code).trim() && n > acc ? n : acc;
  }, 0);
  return String(max + 1);
};

const createBranch = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) throw new HttpError(400, "Name is required.");

  for (let attempt = 0; ; attempt += 1) {
    try {
      const branch = await prisma.branch.create({ data: { name, code: await nextBranchCode() } });
      return res.status(201).json(branch);
    } catch (err) {
      if (err.code === "P2002" && attempt < 5) continue; // code race — retry
      throw err;
    }
  }
});

const updateBranch = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const target = await prisma.branch.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Branch not found.");

  // Code is system-assigned and immutable — only the name is editable.
  const branch = await prisma.branch.update({
    where: { id: target.id },
    data: { name },
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

module.exports = { getPublicBranches, getAllBranches, createBranch, updateBranch, deleteBranch };
