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
  if ("hgsStatus" in body) data.hgsStatus = body.hgsStatus || null;
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

// Contract grand total: (daily price x rental days + extras + one-way + return
// extras) plus VAT. The frontend mirrors this in contract-helpers.computePricing.
const computeTotal = (r, pickUp, dropOff) => {
  const days = Math.max(1, Math.ceil(hoursBetween(pickUp, dropOff) / 24));
  const rental = (num(r.dailyPrice) || 0) * days;
  const addOns = (num(r.extrasTotal) || 0) + (num(r.oneWayFee) || 0) + (num(r.returnExtraAmount) || 0);
  const subtotal = rental + addOns;
  const rate = num(r.vatRate);
  return round2(subtotal * (1 + (rate === null ? 20 : rate) / 100));
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

module.exports = {
  CONTRACT_NOTE_FIELDS,
  CONTRACT_NUMBER_FIELDS,
  num,
  nextContractNo,
  pickContractFields,
  computeTotal,
  computeAllowedKm,
  rentalDays,
};
