const prisma = require("../../lib/prisma");
const asyncHandler = require("../../middleware/async-handler");

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
  alertWindowMaintenanceKm: null,
};

// A non-empty form value to a finite number, else null.
const num = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// A non-empty form value to a positive whole number, else null (falls back to
// the dashboard alert panel's default window — days for most categories, km
// for Bakım).
const positiveInt = (value) => {
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
    alertWindowInspectionDays: positiveInt(req.body.alertWindowInspectionDays),
    alertWindowInsuranceDays: positiveInt(req.body.alertWindowInsuranceDays),
    alertWindowKaskoDays: positiveInt(req.body.alertWindowKaskoDays),
    alertWindowTaxDays: positiveInt(req.body.alertWindowTaxDays),
    alertWindowMaintenanceKm: positiveInt(req.body.alertWindowMaintenanceKm),
  };
  const saved = await prisma.setting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  });
  res.json(saved);
});

module.exports = { getSettings, updateSettings, readSettings };
