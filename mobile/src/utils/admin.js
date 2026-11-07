// Admin ekranlarının ortak yardımcıları: backend yanıt biçimleri, tarih/para
// biçimleme ve web admin panelindeki hesapların (iade aşımı vb.) birebir
// karşılıkları.
import { API_URL } from "../api/client";
import { COLORS } from "../constants/theme";

const pad = (n) => String(n).padStart(2, "0");

// ─── Sayfalı yanıtlar ────────────────────────────────────────────────────────

// Spring Page biçimi: { content, last, totalElements, ... }.
export const PAGE_SIZE = 20;

export const pageRows = (data) => ({
  rows: Array.isArray(data?.content) ? data.content : [],
  last: data?.last ?? true,
  total: data?.totalElements ?? 0,
});

// Arama kutusu: içinde rakam varsa plaka, yoksa müşteri adı olarak gönderilir
// (kontrat/rezervasyon listeleri iki ayrı filtre alanı kabul ediyor).
export const plateOrCustomer = (text) => {
  const q = String(text || "").trim();
  if (!q) return {};
  return /\d/.test(q) ? { plate: q.replace(/\s+/g, "") } : { customer: q };
};

// ─── Kişi adları ─────────────────────────────────────────────────────────────

export const personName = (u) => {
  if (!u) return "—";
  return u.companyTitle || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "—";
};

// Liste satırları `customerName` taşır; detay yanıtları `customer`/`user`
// (+ kurumsal kontratta `corporate`) nesnesi taşır.
export const customerName = (row) => {
  if (!row) return "—";
  if (row.customerName) return row.customerName;
  if (row.corporate?.title) return row.corporate.title;
  return personName(row.customer || row.user);
};

// ─── Tarihler ────────────────────────────────────────────────────────────────
// Kontrat/rezervasyon saatleri Türkiye duvar saati olarak UTC alanlarına
// yazılıyor (backend/src/lib/dates.js) — gösterimde ve formda UTC parçaları
// okunmalı, telefonun yerel saatine çevrilirse +3 saat kayar.

const parseIso = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const wallDate = (iso) => {
  const d = parseIso(iso);
  return d ? `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}` : "—";
};

export const wallDateTime = (iso) => {
  const d = parseIso(iso);
  return d ? `${wallDate(iso)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : "—";
};

export const wallTimeInput = (iso) => {
  const d = parseIso(iso);
  return d ? `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : "";
};

// Gerçek anlar (createdAt, sunucu `now()`) yerel saatle gösterilir.
export const localDate = (iso) => {
  const d = parseIso(iso);
  return d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : "—";
};

// Sadece takvim günü taşıyan alanlar (muayene/bakım tarihi vb.).
export const dayDate = wallDate;

export const nowDateInput = () => {
  const d = new Date();
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

export const nowTimeInput = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// "GG.AA.YYYY" (ya da "YYYY-AA-GG") → { y, m, d }; geçersizse null.
export const parseDateInput = (text) => {
  const s = String(text || "").trim();
  let y;
  let m;
  let d;
  let match = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (match) {
    [, d, m, y] = match.map(Number);
  } else {
    match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return null;
    [, y, m, d] = match.map(Number);
  }
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
};

// "SS:DD" → { h, min }; geçersizse null.
export const parseTimeInput = (text) => {
  const match = String(text || "").trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const min = Number(match[2]);
  if (h > 23 || min > 59) return null;
  return { h, min };
};

// Backend'in beklediği "MM/DD/YYYY HH:mm:ss" (web combineDateAndTime ile aynı).
export const toBackendDateTime = (date, time) =>
  `${pad(date.m)}/${pad(date.d)}/${date.y} ${pad(time.h)}:${pad(time.min)}:00`;

// Tarih girdisinin duvar-saati ms değeri — saklanan ISO'larla karşılaştırmak için.
export const wallMs = (date, time = { h: 0, min: 0 }) =>
  Date.UTC(date.y, date.m - 1, date.d, time.h, time.min);

// Gün hassasiyetinde "YYYY-MM-DD" (UTC parçaları).
export const isoDay = (iso) => {
  const d = parseIso(iso);
  return d ? d.toISOString().slice(0, 10) : "";
};

// Backend'in tarih-only alanları (muayene, ruhsat tarihi…) için "YYYY-MM-DD".
export const toIsoDay = (date) => `${date.y}-${pad(date.m)}-${pad(date.d)}`;

// ─── Para ────────────────────────────────────────────────────────────────────

export const money = (value) => {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
  const n = Math.round(Number(value) * 100) / 100;
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "-" : ""}₺${grouped}${dec === "00" ? "" : `,${dec}`}`;
};

// Kullanıcının yazdığı tutar ("1.250,50" / "1250.5") → sayı; boşsa null, geçersizse NaN.
export const parseAmount = (text) => {
  const s = String(text ?? "").trim().replace(/\s|₺/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
};

// ─── Araçlar ─────────────────────────────────────────────────────────────────

// serializeVehicle `image` alanını görsel id dizisi olarak döner.
export const vehicleImageUrl = (vehicle) => {
  const id = Array.isArray(vehicle?.image) ? vehicle.image[0] : null;
  return id ? `${API_URL}/files/display/${id}` : null;
};

export const VEHICLE_STATUS = {
  AVAILABLE:      { label: "Müsait",      color: COLORS.green, bg: COLORS.greenSoft },
  RENTED:         { label: "Kirada",      color: COLORS.amber, bg: COLORS.amberSoft },
  PASSIVE:        { label: "Pasif",       color: COLORS.muted, bg: "#f0f1f0" },
  OUT_OF_SERVICE: { label: "Servis Dışı", color: COLORS.red,   bg: COLORS.redSoft },
  SOLD:           { label: "Satıldı",     color: COLORS.muted, bg: "#f0f1f0" },
};

export const vehicleStatus = (vehicle) => VEHICLE_STATUS[vehicle?.status] || VEHICLE_STATUS.AVAILABLE;

export const BODY_TYPE_LABEL = {
  BINEK: "Binek",
  SUV: "SUV",
  PANELVAN_MINIBUS: "Panelvan / Minibüs",
  KAMYONET: "Kamyonet",
};

// ─── Kontrat iade hesabı ─────────────────────────────────────────────────────
// Web src/pages/admin/contracts/details/contract-helpers.js'in birebir
// karşılığı: computeBillableDays / computeAllowedKm / computeReturnOverage.

const round2 = (n) => Math.round(n * 100) / 100;
const DAY_MS = 86400000;

export const billableDays = (contract) => {
  const start = parseIso(contract?.pickUpTime);
  const end = parseIso(contract?.dropOffTime);
  if (!start || !end) return 1;
  const hours = Math.floor((end.getTime() - start.getTime()) / 3600000);
  return Math.max(1, Math.ceil(hours / 24));
};

const utcDayStart = (iso) => {
  const d = parseIso(iso);
  return d ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : null;
};

// moment .add(n, "month") gibi ay sonuna kırpar (31 Oca + 1 ay = 28/29 Şub).
const addMonthsClamped = (ms, n) => {
  const d = new Date(ms);
  const total = d.getUTCMonth() + n;
  const y = d.getUTCFullYear() + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay));
};

// Tam ay + kıst gün (backend contract-fields.rentalTerm ile aynı).
export const rentalTerm = (contract) => {
  const s = utcDayStart(contract?.pickUpTime);
  const e = utcDayStart(contract?.dropOffTime);
  if (s == null || e == null || e <= s) return { months: 0, days: 1 };
  let months = 0;
  while (addMonthsClamped(s, months + 1) <= e) months += 1;
  const cursor = addMonthsClamped(s, months);
  const days = Math.round((e - cursor) / DAY_MS);
  return { months, days: months === 0 ? Math.max(1, days) : Math.max(0, days) };
};

export const allowedKm = (contract) => {
  if (contract.unlimitedKm) return Infinity;
  if (contract.rentalType === "MONTHLY") {
    const monthly = Number(contract.monthlyKmLimit) || 0;
    if (monthly <= 0) return Infinity;
    const { months, days } = rentalTerm(contract);
    return months * monthly + Math.ceil(days * (monthly / 30));
  }
  const daily = Number(contract.dailyKmLimit) || 0;
  return daily > 0 ? daily * billableDays(contract) : Infinity;
};

export const returnOverage = (contract, returnKm, returnFuelEighths) => {
  const limit = allowedKm(contract);
  const hasKm = returnKm !== "" && returnKm != null;
  const usedKm = Math.max(0, (Number(returnKm) || 0) - (Number(contract.pickUpKm) || 0));
  const excessKm = !hasKm || !Number.isFinite(limit) ? 0 : Math.max(0, usedKm - limit);
  const kmCharge = round2(excessKm * (Number(contract.kmOverageFee) || 0));
  const missingEighths = Math.max(
    0,
    (Number(contract.pickUpFuelEighths) || 0) - (Number(returnFuelEighths) || 0)
  );
  const fuelCharge = round2(missingEighths * (Number(contract.fuelFeePerEighth) || 0));
  return { allowedKm: limit, usedKm, excessKm, kmCharge, missingEighths, fuelCharge };
};

// Sunucu hatasını kullanıcıya gösterilecek metne çevirir.
export const apiError = (err, fallback = "İşlem başarısız.") => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (!err?.response) return "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.";
  return fallback;
};
