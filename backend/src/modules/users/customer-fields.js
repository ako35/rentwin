const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { ledgerBalances } = require("../../lib/ledger");

// customerCode is auto-assigned on create and never editable afterwards, so it
// is deliberately absent here.
const CUSTOMER_STRING_FIELDS = [
  "companyTitle",
  "taxOffice",
  "nationalId",
  "authorizedNationalId",
  "city",
  "district",
  "notes",
];

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
  // Bireysel only — a blank value clears it (e.g. switching a record to Kurumsal).
  if ("birthDate" in body) data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
};

const TC_ID_RE = /^\d{11}$/;
const TAX_NO_RE = /^\d{10}$/;
// Yabancı uyruklu bireysel müşteriler için: harf+rakam karışık pasaport no.
const PASSPORT_RE = /^[A-Za-z0-9]{5,20}$/;

// Kurumsal müşteri = 10 haneli vergi no (yalnızca rakam). Bireysel müşteri =
// 11 haneli TC kimlik no, ya da yabancı uyruklu müşteriler için pasaport
// numarası (harf+rakam, 5-20 karakter) — iki biçim de aynı `nationalId`
// alanında tutulur, ayrı bir "yabancı" bayrağı yok. Her durumda zorunlu ve her
// numara tek bir müşteride.
const assertNationalId = async (body, currentId) => {
  const isCorporate = body.customerType === "Kurumsal";
  const value = (body.nationalId == null ? "" : String(body.nationalId)).trim();

  if (isCorporate) {
    if (!value) throw new HttpError(400, "Vergi numarası zorunludur.");
    if (!TAX_NO_RE.test(value)) {
      throw new HttpError(400, "Vergi numarası tam olarak 10 haneli ve yalnızca rakamlardan oluşmalıdır.");
    }
  } else {
    if (!value) throw new HttpError(400, "TC kimlik numarası veya pasaport numarası zorunludur.");
    if (!TC_ID_RE.test(value) && !PASSPORT_RE.test(value)) {
      throw new HttpError(
        400,
        "TC kimlik numarası 11 haneli olmalı veya geçerli bir pasaport numarası (5-20 harf/rakam) girilmelidir."
      );
    }
  }

  const clash = await prisma.user.findFirst({
    where: { nationalId: value, ...(currentId ? { id: { not: currentId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    throw new HttpError(409, `Bu ${isCorporate ? "vergi numarası" : "kimlik/pasaport numarası"} zaten başka bir müşteride kayıtlı.`);
  }
};

// Kurumsal müşteride şirketin VKN'sinden (nationalId) ayrı olarak, yetkili
// kişinin kendi 11 haneli T.C. kimlik numarası da zorunlu. Bireysel müşteride
// bu alanın karşılığı yok — kontrol edilmez.
const assertAuthorizedNationalId = (body) => {
  if (body.customerType !== "Kurumsal") return;
  const value = (body.authorizedNationalId == null ? "" : String(body.authorizedNationalId)).trim();
  if (!value) throw new HttpError(400, "Yetkili kişinin T.C. kimlik numarası zorunludur.");
  if (!/^\d{11}$/.test(value)) {
    throw new HttpError(400, "Yetkili kişinin T.C. kimlik numarası tam olarak 11 haneli ve yalnızca rakamlardan oluşmalıdır.");
  }
};

// debit / credit / balance for a set of customers. Contract grand totals and
// contract payments are mirrored into the current-account ledger (see
// lib/ledger.js), so the ledger is the single source of truth — this is now a
// thin pass-through kept for its stable shape and existing call sites.
const customerTotals = (userIds) => ledgerBalances(userIds);

module.exports = {
  CUSTOMER_STRING_FIELDS,
  nextCustomerCode,
  applyCustomerFields,
  assertNationalId,
  assertAuthorizedNationalId,
  customerTotals,
};
