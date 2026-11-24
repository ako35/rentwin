const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parseRecipients } = require("../../lib/mailer");
const asyncHandler = require("../../middleware/async-handler");

const SINGLETON_ID = "singleton";

const EMPTY = {
  defaultDailyKmLimit: null,
  defaultMonthlyKmLimit: null,
  defaultKmOverageFee: null,
  defaultFuelFeePerEighth: null,
  defaultDeposit: null,
  alertWindowInspectionDays: null,
  inspectionAppointmentReminderDays: null,
  alertWindowInsuranceDays: null,
  alertWindowKaskoDays: null,
  alertWindowTaxDays: null,
  alertWindowMaintenanceKm: null,
  gpsAlertEmails: null,
  gpsOverspeedKmh: null,
  gpsKmLimitWarnPercent: null,
  gpsLateReturnGraceMinutes: null,
  gpsOfflineHours: null,
  gpsOfficeLat: null,
  gpsOfficeLng: null,
  gpsOfficeRadiusM: null,
  gpsOutOfRegionKm: null,
  gpsLastTickAt: null,
};

// GPS uyarı alanları (Ayarlar → GPS uyarıları). Blank = default
// (telematics.alerts.js DEFAULTS); out-of-range values are refused rather
// than silently changed.
const GPS_INT_FIELDS = {
  gpsOverspeedKmh: [60, 250],
  gpsKmLimitWarnPercent: [10, 99],
  gpsLateReturnGraceMinutes: [0, 1440],
  gpsOfflineHours: [1, 720],
  gpsOfficeRadiusM: [50, 5000],
  gpsOutOfRegionKm: [10, 2000],
};
const GPS_FLOAT_FIELDS = { gpsOfficeLat: [-90, 90], gpsOfficeLng: [-180, 180] };
const MAX_ALERT_RECIPIENTS = 10;
const GPS_LABELS = {
  gpsOverspeedKmh: "Hız sınırı",
  gpsKmLimitWarnPercent: "Km limiti uyarı yüzdesi",
  gpsLateReturnGraceMinutes: "Gecikme toleransı",
  gpsOfflineHours: "Sinyal yok uyarısı",
  gpsOfficeRadiusM: "Ofis yarıçapı",
  gpsOutOfRegionKm: "Bölge dışı mesafesi",
  gpsOfficeLat: "Ofis enlemi",
  gpsOfficeLng: "Ofis boylamı",
};

const blank = (v) => v === "" || v === null || v === undefined;

const pickGpsFields = (body) => {
  const data = {};
  for (const [field, [min, max]] of Object.entries(GPS_INT_FIELDS)) {
    if (!(field in body)) continue;
    if (blank(body[field])) {
      data[field] = null;
      continue;
    }
    const n = Number(body[field]);
    if (!Number.isInteger(n) || n < min || n > max) {
      throw new HttpError(400, `${GPS_LABELS[field]}: ${min}-${max} arasında tam sayı olmalı.`, "INVALID_GPS_SETTING");
    }
    data[field] = n;
  }
  for (const [field, [min, max]] of Object.entries(GPS_FLOAT_FIELDS)) {
    if (!(field in body)) continue;
    if (blank(body[field])) {
      data[field] = null;
      continue;
    }
    const n = Number(String(body[field]).replace(",", "."));
    if (!Number.isFinite(n) || n < min || n > max) {
      throw new HttpError(400, `${GPS_LABELS[field]} geçersiz.`, "INVALID_GPS_SETTING");
    }
    data[field] = n;
  }
  if ("gpsAlertEmails" in body) {
    const list = parseRecipients(body.gpsAlertEmails);
    if (list.length > MAX_ALERT_RECIPIENTS) {
      throw new HttpError(400, `En fazla ${MAX_ALERT_RECIPIENTS} alıcı girilebilir.`, "INVALID_GPS_SETTING");
    }
    data.gpsAlertEmails = list.length ? list.join(", ") : null;
  }
  // Office location comes as a pair.
  const lat = "gpsOfficeLat" in data ? data.gpsOfficeLat : undefined;
  const lng = "gpsOfficeLng" in data ? data.gpsOfficeLng : undefined;
  if (lat !== undefined && lng !== undefined && (lat == null) !== (lng == null)) {
    throw new HttpError(400, "Ofis konumu için enlem ve boylam birlikte girilmeli.", "INVALID_GPS_SETTING");
  }
  return data;
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
    defaultDeposit: num(req.body.defaultDeposit),
    alertWindowInspectionDays: positiveInt(req.body.alertWindowInspectionDays),
    inspectionAppointmentReminderDays: positiveInt(req.body.inspectionAppointmentReminderDays),
    alertWindowInsuranceDays: positiveInt(req.body.alertWindowInsuranceDays),
    alertWindowKaskoDays: positiveInt(req.body.alertWindowKaskoDays),
    alertWindowTaxDays: positiveInt(req.body.alertWindowTaxDays),
    alertWindowMaintenanceKm: positiveInt(req.body.alertWindowMaintenanceKm),
    // Only the GPS fields present in the body are written, so an older form
    // that doesn't know them can't blank them.
    ...pickGpsFields(req.body || {}),
  };
  const saved = await prisma.setting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  });
  res.json(saved);
});

module.exports = { getSettings, updateSettings, readSettings };
