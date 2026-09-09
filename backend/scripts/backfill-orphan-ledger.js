// One-off cleanup: before deleteContract cleared the ledger, deleting a contract
// left its AUTO_CONTRACT / AUTO_PAYMENT rows behind (LedgerEntry.contract is
// SetNull), so the RENTAL debit kept weighing on the customer's cari balance.
// An AUTO_* row with no contract can only be such an orphan — drop them.
// Idempotent. Runs during the Vercel build after migrate-on-deploy; a follow-up
// commit removes it from postinstall once it has run in production.
try {
  require("dotenv").config();
} catch {
  /* dotenv missing during a cold install — env vars still work */
}

if (!process.env.VERCEL) {
  console.log("[backfill-orphan-ledger] not a Vercel build — skipping (run by hand against dev)");
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.log("[backfill-orphan-ledger] no DATABASE_URL — skipping");
  process.exit(0);
}

(async () => {
  const prisma = require("../src/lib/prisma");

  const { count } = await prisma.ledgerEntry.deleteMany({
    where: { contractId: null, source: { in: ["AUTO_CONTRACT", "AUTO_PAYMENT"] } },
  });

  console.log(`[backfill-orphan-ledger] done — removed ${count} orphan auto ledger row(s)`);
  await prisma.$disconnect();
})().catch((err) => {
  console.error("[backfill-orphan-ledger] aborted:", err);
  process.exit(0);
});
