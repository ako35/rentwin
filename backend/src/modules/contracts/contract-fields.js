const prisma = require("../../lib/prisma");
const { hoursBetween, round2 } = require("../../lib/dates");

// Free-text contract fields (empty string -> null).
const CONTRACT_NOTE_FIELDS = ["customerNote", "adminNote", "referenceNo", "flightNo"];

const CONTRACT_NO_PREFIX = "K";

// Human-readable contract number: K-<year>-00001, restarting each year.
// Highest existing for the year + 1 (survives deletes, unlike a plain count).
// The fixed-width zero-padded suffix makes "contractNo desc" a numeric sort.
const nextContractNo = async (client = prisma) => {
  const prefix = `${CONTRACT_NO_PREFIX}-${new Date().getFullYear()}-`;
  const last = await client.contract.findFirst({
    where: { contractNo: { startsWith: prefix } },
    orderBy: { contractNo: "desc" },
    select: { contractNo: true },
  });
  const lastNum = last ? parseInt(last.contractNo.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastNum + 1).padStart(5, "0")}`;
};

// Numeric contract fields (parsed via num()).
const CONTRACT_NUMBER_FIELDS = [
  "pickUpKm",
  "pickUpFuelEighths",
  "dailyPrice",
  "extrasTotal",
  "oneWayFee",
  "returnExtraAmount",
  "deposit",
  "kmLimit",
  "dailyKmLimit",
  "monthlyKmLimit",
  "kmOverageFee",
  "fuelFeePerEighth",
  "monthlyPrice",
  "vatRate",
];

// Parse a form value to a finite number, or null.
const num = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Pull the editable contract fields out of a request body into a Prisma
// update payload — only keys actually present are copied.
const pickContractFields = (body) => {
  const data = {};
  CONTRACT_NOTE_FIELDS.forEach((field) => {
    if (field in body) data[field] = body[field] === "" ? null : body[field];
  });
  CONTRACT_NUMBER_FIELDS.forEach((field) => {
    if (field in body) data[field] = num(body[field]);
  });
  if ("unlimitedKm" in body) data.unlimitedKm = Boolean(body.unlimitedKm);
  if ("rentalType" in body) data.rentalType = body.rentalType === "MONTHLY" ? "MONTHLY" : "DAILY";
  // hgsStatus is not accepted from the form — it is derived from the HGS check
  // log (see contract-records.syncHgsStatus).
  // Date fields — "" / null clears them.
  ["kbsNotifiedAt", "kbsReleasedAt"].forEach((field) => {
    if (field in body) {
      const raw = body[field];
      const parsed = raw ? new Date(raw) : null;
      data[field] = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }
  });
  if ("corporateId" in body) data.corporateId = body.corporateId || null;
  // Reference account: this contract's total is billed to this customer instead
  // of the driver (see customerTotals in users/customer-fields.js).
  if ("referenceUserId" in body) data.referenceUserId = body.referenceUserId || null;
  return data;
};

// Whole rental days from the contracted pick-up -> drop-off window, min 1.
const rentalDays = (pickUp, dropOff) => Math.max(1, Math.ceil(hoursBetween(pickUp, dropOff) / 24));

// Split a rental window into whole calendar months + leftover ("kıst") days,
// working purely in UTC calendar dates (time-of-day ignored). An 8th->8th window
// is exactly N months with 0 kıst days regardless of the pick-up/drop-off clock
// times: "8 Sep 22:00 -> 8 Oct 10:00" = { months: 1, days: 0 }; "-> 20 Oct" =
// { 1, 12 }. Month steps clamp to the month end (31 Jan +1m -> 28 Feb), like
// dayjs/moment. The frontend mirrors this in contract-helpers.computeRentalTerm.
const utcYmdMs = (value) => {
  const d = new Date(value);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
const addUtcMonths = (value, n) => {
  const d = new Date(value);
  const anchor = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const lastDay = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)).getUTCDate();
  return Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), Math.min(d.getUTCDate(), lastDay));
};
const rentalTerm = (start, end) => {
  const endMs = utcYmdMs(end);
  let months = 0;
  while (addUtcMonths(start, months + 1) <= endMs) months += 1;
  let days = Math.max(0, Math.round((endMs - addUtcMonths(start, months)) / 86400000));
  if (months === 0 && days === 0) days = 1; // a same-day / sub-day window is one day
  return { months, days };
};

// Price one billing period. The frontend mirrors this in
// contract-helpers.computePricing.
//   DAILY   : net = gross = days x unitPrice          (VAT-inclusive, unchanged)
//   MONTHLY : net  = months x unitPrice + kıst days x (unitPrice / 30)
//             gross = net x (1 + vatRate/100)          (VAT added on top)
// so the month length (28/30/31) never shifts the price.
const pricePeriod = ({ rentalType, unitPrice, start, end, vatRate = 20 }) => {
  const unit = num(unitPrice) || 0;
  if (rentalType === "MONTHLY") {
    const { months, days } = rentalTerm(start, end);
    const netAmount = round2(months * unit + days * round2(unit / 30));
    const grossAmount = round2(netAmount * (1 + (num(vatRate) || 0) / 100));
    return { months, kistDays: days, netAmount, grossAmount };
  }
  const days = rentalDays(start, end);
  const net = round2(unit * days);
  return { months: 0, kistDays: days, netAmount: net, grossAmount: net };
};

// Km allowance for the whole rental: the stricter of the daily and the monthly
// cap. A missing limit is no cap on that axis; both missing (or unlimited) ->
// null. In MONTHLY rental mode the monthly cap follows the same month + kıst-day
// breakdown as the price. The frontend mirrors this in
// contract-helpers.computeAllowedKm.
const computeAllowedKm = (r, pickUp, dropOff) => {
  if (r.unlimitedKm) return null;
  const dk = num(r.dailyKmLimit);
  const mk = num(r.monthlyKmLimit);

  if (r.rentalType === "MONTHLY") {
    const { months, days } = rentalTerm(pickUp, dropOff);
    const daily = dk ? dk * (months * 30 + days) : Infinity;
    const monthly = mk ? months * mk + Math.ceil(days * (mk / 30)) : Infinity;
    const eff = Math.min(daily, monthly);
    return Number.isFinite(eff) ? eff : null;
  }

  const days = rentalDays(pickUp, dropOff);
  const daily = dk ? dk * days : Infinity;
  const monthly = mk ? mk * Math.ceil(days / 30) : Infinity;
  const eff = Math.min(daily, monthly);
  return Number.isFinite(eff) ? eff : null;
};

// --- HGS check coverage -----------------------------------------------------
// The HGS/OGS check result is never entered by hand: it is "done" once the
// logged query ranges together span the whole rental window. These helpers do
// that union test at day precision. The frontend mirrors this in
// contract-helpers.hgsRangesCoverPeriod.
const isoDay = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const isoDayAfter = (day) => {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const hgsRangesCoverPeriod = (rows, pickUp, dropOff) => {
  const start = isoDay(pickUp);
  const end = isoDay(dropOff);
  if (!start || !end || end < start || !Array.isArray(rows) || rows.length === 0) return false;
  const intervals = rows
    .map((r) => ({ from: isoDay(r.rangeFrom), to: isoDay(r.rangeTo) }))
    .filter((r) => r.from && r.to && r.from <= r.to)
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  if (intervals.length === 0 || intervals[0].from > start) return false;
  let reach = intervals[0].to;
  for (let i = 1; i < intervals.length; i += 1) {
    if (intervals[i].from > isoDayAfter(reach)) break; // gap in coverage
    if (intervals[i].to > reach) reach = intervals[i].to;
  }
  return reach >= end;
};

module.exports = {
  CONTRACT_NOTE_FIELDS,
  CONTRACT_NUMBER_FIELDS,
  num,
  nextContractNo,
  pickContractFields,
  pricePeriod,
  computeAllowedKm,
  rentalDays,
  rentalTerm,
  hgsRangesCoverPeriod,
};
