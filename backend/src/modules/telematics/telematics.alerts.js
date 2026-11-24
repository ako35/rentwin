const prisma = require("../../lib/prisma");
const mailer = require("../../lib/mailer");
const { SITE_URL, business } = require("../../lib/site");

// GPS uyarıları (docs/gps-takip-yol-haritasi.md, Faz 3).
//
// An alert is a TelematicsAlert row: vehicle, optional contract, type,
// severity and a few text parameters in `data` — never coordinates. Each rule
// builds a dedupeKey so the same situation opens one alert, however often the
// check runs. Critical and warning alerts are also e-mailed (when SMTP and
// recipients are set); info alerts stay in the panel.

const SEVERITY_BY_TYPE = {
  ACCIDENT: "CRITICAL", // cihazın ivmeölçeri kaza algıladı (Faz 4)
  DEVICE_TAMPER: "CRITICAL", // cihazın gücü kesildi / sökülüyor
  TOW: "CRITICAL", // kontak kapalıyken hareket
  LATE_RETURN: "WARNING", // dönüş saati geçti, araç ofiste değil
  OVERSPEED: "WARNING",
  KM_LIMIT_NEAR: "WARNING",
  KM_LIMIT_EXCEEDED: "WARNING",
  MAINTENANCE_OVERDUE: "WARNING",
  DEVICE_OFFLINE: "WARNING",
  LOW_BATTERY: "WARNING",
  OUT_OF_REGION: "WARNING",
  MAINTENANCE_DUE: "INFO",
  ARRIVED_AT_OFFICE: "INFO",
};
const ALERT_TYPES = Object.keys(SEVERITY_BY_TYPE);
const EMAIL_SEVERITIES = ["CRITICAL", "WARNING"];

// Defaults for the Ayarlar → GPS uyarıları fields left blank.
const DEFAULTS = {
  overspeedKmh: 140,
  kmLimitWarnPercent: 80,
  lateReturnGraceMinutes: 60,
  offlineHours: 24,
  officeLat: business.geo.latitude,
  officeLng: business.geo.longitude,
  officeRadiusM: 300,
  outOfRegionKm: null, // off unless set
  maintenanceWindowKm: 1000, // same default as the dashboard's Bakım window
};

const pick = (value, fallback) => (value == null ? fallback : value);

const gpsSettings = (s = {}) => ({
  alertEmails: mailer.parseRecipients(s.gpsAlertEmails),
  overspeedKmh: pick(s.gpsOverspeedKmh, DEFAULTS.overspeedKmh),
  kmLimitWarnPercent: pick(s.gpsKmLimitWarnPercent, DEFAULTS.kmLimitWarnPercent),
  lateReturnGraceMinutes: pick(s.gpsLateReturnGraceMinutes, DEFAULTS.lateReturnGraceMinutes),
  offlineHours: pick(s.gpsOfflineHours, DEFAULTS.offlineHours),
  office: {
    latitude: pick(s.gpsOfficeLat, DEFAULTS.officeLat),
    longitude: pick(s.gpsOfficeLng, DEFAULTS.officeLng),
  },
  officeRadiusM: pick(s.gpsOfficeRadiusM, DEFAULTS.officeRadiusM),
  outOfRegionKm: pick(s.gpsOutOfRegionKm, DEFAULTS.outOfRegionKm),
  maintenanceWindowKm: pick(s.alertWindowMaintenanceKm, DEFAULTS.maintenanceWindowKm),
});

// Traccar alarm names (attributes.alarm) that open an alert.
const ALARM_ALERTS = {
  accident: "ACCIDENT",
  powerCut: "DEVICE_TAMPER",
  powerOff: "DEVICE_TAMPER",
  tampering: "DEVICE_TAMPER",
  removing: "DEVICE_TAMPER",
  tow: "TOW",
  lowBattery: "LOW_BATTERY",
  lowPower: "LOW_BATTERY",
};
const alarmAlertType = (alarm) => ALARM_ALERTS[alarm] || null;
const ALARM_TR = {
  accident: "kaza algılandı",
  hardBraking: "sert fren",
  hardAcceleration: "sert hızlanma",
  hardCornering: "sert viraj",
  powerCut: "güç kesildi",
  powerOff: "cihaz kapandı",
  tampering: "cihaza müdahale",
  removing: "cihaz sökülüyor",
  tow: "çekici",
  lowBattery: "düşük batarya",
  lowPower: "düşük güç",
};

// Start of the `minutes`-long window `date` falls in, as an ISO string — the
// time part of a dedupeKey for alerts that may legitimately repeat later.
const timeBucket = (date, minutes) => {
  const ms = minutes * 60 * 1000;
  return new Date(Math.floor(new Date(date).getTime() / ms) * ms).toISOString();
};

// "NEAR" at warnPercent of the contract's allowance, "EXCEEDED" past it.
const kmLimitLevel = ({ usedKm, allowedKm, warnPercent }) => {
  if (!Number.isFinite(allowedKm) || allowedKm <= 0 || !Number.isFinite(usedKm)) return null;
  if (usedKm > allowedKm) return "EXCEEDED";
  if (usedKm >= (allowedKm * warnPercent) / 100) return "NEAR";
  return null;
};

// ------------------------------------------------------------------ texts

const fmtKm = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString("tr-TR") : "?");
const fmtInstant = (d) =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" }).format(
    new Date(d)
  );
// Rental times are Türkiye wall-clock stored as UTC.
const fmtWall = (d) =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" }).format(new Date(d));

// One-line Turkish description, for e-mail. The admin panel builds its own
// (translated) text from the same `data`.
const alertText = (alert) => {
  const d = alert.data || {};
  const contract = d.contractNo ? `kontrat ${d.contractNo}` : "kontrat";
  switch (alert.type) {
    case "ACCIDENT":
      return "Cihazın ivmeölçeri kaza algıladı. Aracı ve sürücüyü hemen kontrol edin.";
    case "DEVICE_TAMPER":
      return `Takip cihazı alarmı: ${ALARM_TR[d.alarm] || d.alarm || "alarm"}. Cihazın gücü kesilmiş veya cihaz sökülüyor olabilir.`;
    case "TOW":
      return "Kontak kapalıyken araç hareket ediyor (çekiciyle taşınıyor olabilir).";
    case "OVERSPEED":
      return `Hız ${d.speedKmh ?? "?"} km/s (sınır ${d.limitKmh ?? "?"} km/s).`;
    case "KM_LIMIT_NEAR":
      return `${contract}: km limitinin %${d.percent ?? "?"}'i kullanıldı (${fmtKm(d.usedKm)} / ${fmtKm(d.allowedKm)} km).`;
    case "KM_LIMIT_EXCEEDED":
      return `${contract}: km limiti aşıldı (${fmtKm(d.usedKm)} / ${fmtKm(d.allowedKm)} km).`;
    case "MAINTENANCE_DUE":
      return `Bakıma ${fmtKm(d.kmLeft)} km kaldı (bakım km'si ${fmtKm(d.nextKm)}).`;
    case "MAINTENANCE_OVERDUE":
      return `Bakım km'si ${fmtKm(Math.abs(d.kmLeft || 0))} km geçti (bakım km'si ${fmtKm(d.nextKm)}).`;
    case "LATE_RETURN":
      return `${contract}: dönüş zamanı (${d.dropOffTime ? fmtWall(d.dropOffTime) : "?"}) geçti, araç ofiste değil.`;
    case "DEVICE_OFFLINE":
      return `${d.hours ?? "?"} saattir takip cihazından sinyal gelmiyor.`;
    case "LOW_BATTERY":
      return "Takip cihazının bataryası zayıf.";
    case "OUT_OF_REGION":
      return `Araç ofisten yaklaşık ${d.distanceKm ?? "?"} km uzakta.`;
    case "ARRIVED_AT_OFFICE":
      return `Kiradaki araç ofise geldi${d.contractNo ? ` (kontrat ${d.contractNo})` : ""}.`;
    default:
      return alert.type;
  }
};

// ---------------------------------------------------------------- storage

// Opens an alert unless one with the same dedupeKey exists. Returns the row,
// or null for a duplicate.
const createAlert = async ({ vehicleId, contractId = null, type, dedupeKey, data = null, occurredAt = new Date() }) => {
  const severity = SEVERITY_BY_TYPE[type];
  if (!severity) throw new Error(`Unknown alert type ${type}`);
  try {
    return await prisma.telematicsAlert.create({
      data: { vehicleId, contractId, type, severity, dedupeKey, data, occurredAt },
    });
  } catch (err) {
    if (err.code === "P2002") return null; // already open(ed) once
    throw err;
  }
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const ALERTS_URL = `${SITE_URL}/admin/vehicles/gps-alerts`;

const buildAlertEmail = (alerts) => {
  const lines = alerts.map((a) => ({
    when: fmtInstant(a.occurredAt),
    plate: a.vehicle?.licensePlate || "?",
    critical: a.severity === "CRITICAL",
    text: alertText(a),
  }));
  const first = lines[0];
  const subject =
    lines.length === 1
      ? `Rentwin GPS: ${first.plate} — ${first.text}`
      : `Rentwin GPS: ${lines.length} yeni uyarı (${[...new Set(lines.map((l) => l.plate))].slice(0, 3).join(", ")})`;
  const text = [
    ...lines.map((l) => `${l.critical ? "[ACİL] " : ""}${l.when}  ${l.plate}  ${l.text}`),
    "",
    `Tüm uyarılar: ${ALERTS_URL}`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">
<p>Rentwin GPS takip sistemi aşağıdaki uyarıları açtı:</p>
<table cellpadding="6" style="border-collapse:collapse">
${lines
  .map(
    (l) =>
      `<tr style="border-bottom:1px solid #eee"><td style="white-space:nowrap;color:#666">${escapeHtml(l.when)}</td>` +
      `<td style="white-space:nowrap"><strong>${escapeHtml(l.plate)}</strong></td>` +
      `<td>${l.critical ? '<strong style="color:#b93a3a">ACİL</strong> ' : ""}${escapeHtml(l.text)}</td></tr>`
  )
  .join("\n")}
</table>
<p><a href="${ALERTS_URL}">Tüm GPS uyarılarını aç</a></p>
<p style="color:#888;font-size:12px">Bu e-posta Rentwin admin panelindeki GPS uyarı ayarlarına göre gönderildi. Konum bilgisi içermez.</p>
</div>`;
  return { subject: subject.slice(0, 200), text, html };
};

// E-mails the critical/warning alerts not sent yet (last 24 h, still
// unacknowledged) in one message. Rows are claimed before sending so a tick
// and a webhook running at the same moment don't both send them.
const flushAlertEmails = async (cfg, now = new Date()) => {
  if (!mailer.isConfigured()) return { sent: 0, skipped: "MAIL_NOT_CONFIGURED" };
  if (!cfg.alertEmails.length) return { sent: 0, skipped: "MAIL_NO_RECIPIENTS" };

  const pending = await prisma.telematicsAlert.findMany({
    where: {
      emailedAt: null,
      acknowledgedAt: null,
      severity: { in: EMAIL_SEVERITIES },
      createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
    orderBy: { occurredAt: "asc" },
    take: 50,
  });
  if (!pending.length) return { sent: 0 };

  const claimAt = new Date(now.getTime());
  await prisma.telematicsAlert.updateMany({
    where: { id: { in: pending.map((p) => p.id) }, emailedAt: null },
    data: { emailedAt: claimAt },
  });
  const claimed = await prisma.telematicsAlert.findMany({
    where: { id: { in: pending.map((p) => p.id) }, emailedAt: claimAt },
    include: { vehicle: { select: { licensePlate: true } } },
    orderBy: [{ severity: "asc" }, { occurredAt: "asc" }], // CRITICAL sorts before WARNING
  });
  if (!claimed.length) return { sent: 0 };

  try {
    await mailer.sendMail({ to: cfg.alertEmails, ...buildAlertEmail(claimed) });
    return { sent: claimed.length };
  } catch (err) {
    console.error("[telematics] alert e-mail failed:", err.message);
    await prisma.telematicsAlert.updateMany({
      where: { id: { in: claimed.map((a) => a.id) }, emailedAt: claimAt },
      data: { emailedAt: null },
    });
    return { sent: 0, error: err.code || "MAIL_FAILED" };
  }
};

module.exports = {
  SEVERITY_BY_TYPE,
  ALERT_TYPES,
  EMAIL_SEVERITIES,
  DEFAULTS,
  gpsSettings,
  alarmAlertType,
  timeBucket,
  kmLimitLevel,
  alertText,
  createAlert,
  buildAlertEmail,
  flushAlertEmails,
  ALERTS_URL,
};
