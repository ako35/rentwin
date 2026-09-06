const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { ledgerStatement, ledgerBalances } = require("../../lib/ledger");

// Categories an admin may pick when entering a movement by hand. Auto rows
// (RENTAL debit, PAYMENT credit from a contract) are owned by the contract flow.
const MANUAL_DEBIT_CATEGORIES = ["TRAFFIC_FINE", "DAMAGE", "FUEL", "MANUAL_DEBIT"];
const MANUAL_CREDIT_CATEGORIES = ["PAYMENT", "REFUND", "DISCOUNT", "MANUAL_CREDIT"];
const PAYMENT_METHODS = ["Cash", "CreditCard", "Transfer", "Other"];

const parseAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, "Tutar sıfırdan büyük olmalıdır.");
  return Math.round(n * 100) / 100;
};

const parseDate = (value) => {
  if (!value) return new Date();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, "Geçersiz tarih.");
  return d;
};

const manualEntryData = (body) => {
  const direction = body.direction === "CREDIT" ? "CREDIT" : "DEBIT";
  const allowed = direction === "CREDIT" ? MANUAL_CREDIT_CATEGORIES : MANUAL_DEBIT_CATEGORIES;
  const category = allowed.includes(body.category) ? body.category : allowed[allowed.length - 1];
  const method =
    direction === "CREDIT" && PAYMENT_METHODS.includes(body.method) ? body.method : null;

  return {
    direction,
    category,
    method,
    amount: parseAmount(body.amount),
    date: parseDate(body.date),
    description: body.description ? String(body.description).trim() : null,
    invoiceNo: body.invoiceNo ? String(body.invoiceNo).trim() : null,
    source: "MANUAL",
  };
};

const getUserLedger = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, companyTitle: true, customerType: true, customerCode: true },
  });
  if (!user) throw new HttpError(404, "Cari bulunamadı.");

  const statement = await ledgerStatement(userId, {
    from: req.query.from,
    to: req.query.to,
    category: req.query.category,
  });
  const totals = (await ledgerBalances([userId]))[userId] || { debit: 0, credit: 0 };

  res.json({
    user: {
      id: user.id,
      name: (user.companyTitle || `${user.firstName} ${user.lastName}`).trim(),
      customerCode: user.customerCode || null,
      customerType: user.customerType,
    },
    debit: totals.debit,
    credit: totals.credit,
    balance: Math.round((totals.credit - totals.debit) * 100) / 100,
    ...statement,
  });
});

const createEntry = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.body.userId }, select: { id: true } });
  if (!user) throw new HttpError(404, "Cari bulunamadı.");

  const entry = await prisma.ledgerEntry.create({
    data: { userId: user.id, ...manualEntryData(req.body) },
  });
  res.status(201).json(entry);
});

const assertManual = async (id) => {
  const entry = await prisma.ledgerEntry.findUnique({ where: { id } });
  if (!entry) throw new HttpError(404, "Kayıt bulunamadı.");
  if (entry.source !== "MANUAL") {
    throw new HttpError(403, "Kontrattan gelen kayıtlar buradan düzenlenemez.");
  }
  return entry;
};

const updateEntry = asyncHandler(async (req, res) => {
  await assertManual(req.params.id);
  const entry = await prisma.ledgerEntry.update({
    where: { id: req.params.id },
    data: manualEntryData(req.body),
  });
  res.json(entry);
});

const deleteEntry = asyncHandler(async (req, res) => {
  await assertManual(req.params.id);
  await prisma.ledgerEntry.delete({ where: { id: req.params.id } });
  res.json({ message: "Kayıt silindi." });
});

module.exports = { getUserLedger, createEntry, updateEntry, deleteEntry };
