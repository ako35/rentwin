const prisma = require("../../lib/prisma");
const asyncHandler = require("../../middleware/async-handler");
const { getVisionUsage } = require("../../lib/gemini");

const SINGLETON_ID = "singleton";

const EMPTY = {
  defaultDailyKmLimit: null,
  defaultMonthlyKmLimit: null,
  defaultKmOverageFee: null,
  defaultFuelFeePerEighth: null,
  kabisSystem1Name: "Sistem 1",
  kabisSystem2Name: "Sistem 2",
};

// A non-empty form value to a finite number, else null.
const num = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// A non-empty form value trimmed, else the fallback (these columns are NOT NULL).
const str = (value, fallback) => {
  const s = (value ?? "").toString().trim();
  return s || fallback;
};

// The app-wide settings row (created lazily). Also read directly by
// contracts.admin.controller when pre-filling a new contract.
const readSettings = async (client = prisma) =>
  (await client.setting.findUnique({ where: { id: SINGLETON_ID } })) || { id: SINGLETON_ID, ...EMPTY };

const getSettings = asyncHandler(async (req, res) => {
  res.json(await readSettings());
});

const updateSettings = asyncHandler(async (req, res) => {
  const data = {
    defaultDailyKmLimit: num(req.body.defaultDailyKmLimit),
    defaultMonthlyKmLimit: num(req.body.defaultMonthlyKmLimit),
    defaultKmOverageFee: num(req.body.defaultKmOverageFee),
    defaultFuelFeePerEighth: num(req.body.defaultFuelFeePerEighth),
    kabisSystem1Name: str(req.body.kabisSystem1Name, EMPTY.kabisSystem1Name),
    kabisSystem2Name: str(req.body.kabisSystem2Name, EMPTY.kabisSystem2Name),
  };
  const saved = await prisma.setting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  });
  res.json(saved);
});

// Today's Gemini vision-quota usage (shared by "Ruhsattan Doldur" and
// "Belgeden Doldur" — see lib/gemini.js) for the admin UI's usage badge.
const getAiUsage = asyncHandler(async (req, res) => {
  res.json(await getVisionUsage());
});

module.exports = { getSettings, updateSettings, readSettings, getAiUsage };
