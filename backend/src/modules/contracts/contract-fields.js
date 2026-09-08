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

// Contract grand total: daily price x rental days + extras + one-way + return
// extras. Prices are entered VAT-inclusive, so nothing is added on top; vatRate
// only drives the net/tax split on the invoice. The frontend mirrors this in
// contract-helpers.computePricing.
const computeTotal = (r, pickUp, dropOff) => {
  const days = Math.max(1, Math.ceil(hoursBetween(pickUp, dropOff) / 24));
  const rental = (num(r.dailyPrice) || 0) * days;
  const addOns = (num(r.extrasTotal) || 0) + (num(r.oneWayFee) || 0) + (num(r.returnExtraAmount) || 0);
  return round2(rental + addOns);
};

// Whole rental days from the contracted pick-up -> drop-off window, min 1.
const rentalDays = (pickUp, dropOff) => Math.max(1, Math.ceil(hoursBetween(pickUp, dropOff) / 24));

// Km allowance for the whole rental: the stricter of (daily x days) and
// (monthly x months). A missing limit is treated as no cap on that axis; if
// both are missing (or km is unlimited) there is no limit -> null. The frontend
// mirrors this in contract-helpers.computeAllowedKm.
const computeAllowedKm = (r, pickUp, dropOff) => {
  if (r.unlimitedKm) return null;
  const days = rentalDays(pickUp, dropOff);
  const daily = num(r.dailyKmLimit) ? num(r.dailyKmLimit) * days : Infinity;
  const monthly = num(r.monthlyKmLimit)
    ? num(r.monthlyKmLimit) * Math.ceil(days / 30)
    : Infinity;
  const effective = Math.min(daily, monthly);
  return Number.isFinite(effective) ? effective : null;
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
  computeTotal,
  computeAllowedKm,
  rentalDays,
  hgsRangesCoverPeriod,
};
