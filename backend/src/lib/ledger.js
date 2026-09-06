const prisma = require("./prisma");
const { round2 } = require("./dates");

// Double-entry current-account ledger helpers. The contract flow calls these to
// keep the AUTO_* rows in sync; the ledger module owns the MANUAL rows and the
// read side (statement + balances).

const AUTO_SOURCES = ["AUTO_CONTRACT", "AUTO_PAYMENT"];

const contractOwnerId = (contract) => contract.referenceUserId || contract.userId;

// Keep the single AUTO_CONTRACT / RENTAL debit for a contract in step with its
// current grand total. Drops the row when the contract is cancelled or has no
// positive total.
const syncContractDebit = async (contract, client = prisma) => {
  const amount = round2(contract.totalPrice || 0);
  const drop = contract.status === "CANCELLED" || amount <= 0;

  const existing = await client.ledgerEntry.findFirst({
    where: { contractId: contract.id, source: "AUTO_CONTRACT" },
    select: { id: true },
  });

  if (drop) {
    if (existing) await client.ledgerEntry.delete({ where: { id: existing.id } });
    return;
  }

  const data = { amount, userId: contractOwnerId(contract), category: "RENTAL", direction: "DEBIT" };
  if (existing) {
    await client.ledgerEntry.update({ where: { id: existing.id }, data });
  } else {
    await client.ledgerEntry.create({
      data: {
        ...data,
        contractId: contract.id,
        date: contract.createdAt || new Date(),
        source: "AUTO_CONTRACT",
      },
    });
  }
};

// Create / update the AUTO_PAYMENT credit that mirrors one ContractPayment.
const mirrorPayment = async (payment, contract, client = prisma) => {
  const data = {
    userId: contractOwnerId(contract),
    contractId: contract.id,
    date: payment.paidAt || new Date(),
    direction: "CREDIT",
    category: "PAYMENT",
    amount: round2(payment.amount || 0),
    method: payment.method || null,
    description: payment.note || null,
    source: "AUTO_PAYMENT",
  };
  const existing = await client.ledgerEntry.findUnique({
    where: { contractPaymentId: payment.id },
    select: { id: true },
  });
  if (existing) {
    await client.ledgerEntry.update({ where: { id: existing.id }, data });
  } else {
    await client.ledgerEntry.create({ data: { ...data, contractPaymentId: payment.id } });
  }
};

const unmirrorPayment = async (contractPaymentId, client = prisma) => {
  await client.ledgerEntry.deleteMany({ where: { contractPaymentId } });
};

// Remove every auto row a contract produced (used when it is cancelled).
const voidContractLedger = async (contractId, client = prisma) => {
  await client.ledgerEntry.deleteMany({
    where: { contractId, source: { in: AUTO_SOURCES } },
  });
};

// Recreate the debit and re-mirror every payment (used when a contract is reopened).
const restoreContractLedger = async (contract, client = prisma) => {
  await syncContractDebit(contract, client);
  const payments = await client.contractPayment.findMany({ where: { contractId: contract.id } });
  for (const payment of payments) await mirrorPayment(payment, contract, client);
};

// debit / credit totals per user, straight from the ledger.
const ledgerBalances = async (userIds) => {
  if (!userIds.length) return {};
  const rows = await prisma.ledgerEntry.groupBy({
    by: ["userId", "direction"],
    where: { userId: { in: userIds } },
    _sum: { amount: true },
  });
  const totals = {};
  for (const row of rows) {
    const t = totals[row.userId] || (totals[row.userId] = { debit: 0, credit: 0 });
    if (row.direction === "DEBIT") t.debit = round2(row._sum.amount || 0);
    else t.credit = round2(row._sum.amount || 0);
  }
  return totals;
};

const signed = (entry) => (entry.direction === "CREDIT" ? 1 : -1) * (entry.amount || 0);

// Bank-statement view for one account: opening balance (movements strictly
// before `from`), the visible rows each carrying the true running balance, and
// the closing / current balances. Category filter narrows what is shown, not
// what the running balance reflects.
const ledgerStatement = async (userId, { from, to, category } = {}) => {
  const all = await prisma.ledgerEntry.findMany({
    where: { userId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: { contract: { select: { contractNo: true } } },
  });

  const fromD = from ? new Date(from) : null;
  const toD = to ? new Date(to) : null;

  let running = 0;
  let opening = 0;
  let closing = 0;
  const rows = [];

  for (const entry of all) {
    if (fromD && entry.date < fromD) {
      running = round2(running + signed(entry));
      opening = running;
      closing = running;
      continue;
    }
    running = round2(running + signed(entry));
    if (!toD || entry.date <= toD) closing = running;

    const visible = (!toD || entry.date <= toD) && (!category || entry.category === category);
    if (visible) {
      rows.push({
        id: entry.id,
        date: entry.date,
        direction: entry.direction,
        category: entry.category,
        amount: entry.amount,
        description: entry.description,
        method: entry.method,
        invoiceNo: entry.invoiceNo,
        contractId: entry.contractId,
        contractNo: entry.contract?.contractNo || null,
        source: entry.source,
        balance: running,
      });
    }
  }

  return { opening, closing, currentBalance: running, rows };
};

module.exports = {
  syncContractDebit,
  mirrorPayment,
  unmirrorPayment,
  voidContractLedger,
  restoreContractLedger,
  ledgerBalances,
  ledgerStatement,
};
