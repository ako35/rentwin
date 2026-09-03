const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");

// customerCode is auto-assigned on create and never editable afterwards, so it
// is deliberately absent here.
const CUSTOMER_STRING_FIELDS = ["companyTitle", "taxOffice", "nationalId", "city", "district", "notes"];

const CUSTOMER_CODE_PREFIX = "M";
const CUSTOMER_CODE_PAD = 5;

// Auto-assigned customer code: M00001, M00002 … (highest existing + 1).
const nextCustomerCode = async (client = prisma) => {
  const last = await client.user.findFirst({
    where: { customerCode: { startsWith: CUSTOMER_CODE_PREFIX } },
    orderBy: { customerCode: "desc" },
    select: { customerCode: true },
  });
  const lastNum = last ? parseInt(last.customerCode.slice(CUSTOMER_CODE_PREFIX.length), 10) || 0 : 0;
  return `${CUSTOMER_CODE_PREFIX}${String(lastNum + 1).padStart(CUSTOMER_CODE_PAD, "0")}`;
};

// Copy the CRM string/enum fields from a request body onto a Prisma payload.
const applyCustomerFields = (body, data) => {
  CUSTOMER_STRING_FIELDS.forEach((f) => {
    if (f in body) data[f] = body[f] === "" ? null : body[f];
  });
  if ("active" in body) data.active = Boolean(body.active);
  if ("customerType" in body) {
    data.customerType = body.customerType === "Kurumsal" ? "Kurumsal" : "Bireysel";
  }
};

// Bireysel müşteri = 11 haneli TC, Kurumsal müşteri = 10 haneli vergi no.
// Yalnızca rakam, zorunlu ve her numara tek bir müşteride.
const assertNationalId = async (body, currentId) => {
  const isCorporate = body.customerType === "Kurumsal";
  const value = (body.nationalId == null ? "" : String(body.nationalId)).trim();
  const label = isCorporate ? "Vergi numarası" : "TC kimlik numarası";
  const length = isCorporate ? 10 : 11;

  if (!value) throw new HttpError(400, `${label} zorunludur.`);
  if (!/^\d+$/.test(value) || value.length !== length) {
    throw new HttpError(400, `${label} tam olarak ${length} haneli ve yalnızca rakamlardan oluşmalıdır.`);
  }

  const clash = await prisma.user.findFirst({
    where: { nationalId: value, ...(currentId ? { id: { not: currentId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    throw new HttpError(409, `Bu ${isCorporate ? "vergi numarası" : "TC numarası"} zaten başka bir müşteride kayıtlı.`);
  }
};

// Contract totals for a set of customers: debit = Σ contract grand totals,
// credit = Σ payments, balance = credit - debit (negative => customer owes).
// A contract with a referenceUserId is billed entirely to that reference
// account instead of the driver, so its total + payments land there.
const customerTotals = async (userIds) => {
  if (!userIds.length) return {};
  const ids = new Set(userIds);
  const rows = await prisma.contract.findMany({
    where: {
      status: { not: "CANCELLED" },
      OR: [{ userId: { in: userIds } }, { referenceUserId: { in: userIds } }],
    },
    select: { userId: true, referenceUserId: true, totalPrice: true, payments: { select: { amount: true } } },
  });
  const totals = {};
  for (const r of rows) {
    const ownerId = r.referenceUserId || r.userId;
    if (!ids.has(ownerId)) continue;
    const t = totals[ownerId] || (totals[ownerId] = { debit: 0, credit: 0 });
    t.debit += r.totalPrice || 0;
    t.credit += r.payments.reduce((s, p) => s + p.amount, 0);
  }
  return totals;
};

module.exports = {
  CUSTOMER_STRING_FIELDS,
  nextCustomerCode,
  applyCustomerFields,
  assertNationalId,
  customerTotals,
};
