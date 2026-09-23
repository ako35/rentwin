const prisma = require("../../lib/prisma");
const asyncHandler = require("../../middleware/async-handler");
const { getVisionUsage } = require("../../lib/claude");

const SINGLETON_ID = "singleton";

const EMPTY = {
  defaultDailyKmLimit: null,
  defaultMonthlyKmLimit: null,
  defaultKmOverageFee: null,
  defaultFuelFeePerEighth: null,
  alertWindowInspectionDays: null,
  alertWindowInsuranceDays: null,
  alertWindowKaskoDays: null,
  alertWindowTaxDays: null,
};

// A non-empty form value to a finite number, else null.
const num = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// A non-empty form value to a positive whole day count, else null (falls
// back to the dashboard alert panel's default window).
const dayWindow = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
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
    alertWindowInspectionDays: dayWindow(req.body.alertWindowInspectionDays),
    alertWindowInsuranceDays: dayWindow(req.body.alertWindowInsuranceDays),
    alertWindowKaskoDays: dayWindow(req.body.alertWindowKaskoDays),
    alertWindowTaxDays: dayWindow(req.body.alertWindowTaxDays),
  };
  const saved = await prisma.setting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  });
  res.json(saved);
});

// Today's Claude vision-usage counter (shared by "Ruhsattan Doldur" and
// "Belgeden Doldur" — see lib/claude.js) for the admin UI's usage badge.
const getAiUsage = asyncHandler(async (req, res) => {
  res.json(await getVisionUsage());
});

module.exports = { getSettings, updateSettings, readSettings, getAiUsage };
