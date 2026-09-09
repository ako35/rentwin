// One-off backfill after dropping ContractPeriod: the migration already folded
// period #2..N into ContractExtension rows and left totalPrice untouched. This
// pass just calls recomputeContractFinancials on every contract so any rounding
// drift between the old period sum and the new (base + Σ extension) formula is
// reconciled, and the AUTO_CONTRACT ledger debit re-synced. Idempotent — safe to
// run repeatedly. Runs during the Vercel build after migrate-on-deploy; a
// follow-up commit drops it from postinstall once it has run in production.
try {
  require("dotenv").config();
} catch {
  /* dotenv missing during a cold install — env vars still work */
}

if (!process.env.VERCEL) {
  console.log("[backfill-recompute] not a Vercel build — skipping (run by hand against dev)");
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.log("[backfill-recompute] no DATABASE_URL — skipping");
  process.exit(0);
}

(async () => {
  const prisma = require("../src/lib/prisma");
  const { recomputeContractFinancials } = require("../src/modules/contracts/contract-financials");

  const contracts = await prisma.contract.findMany({ select: { id: true, contractNo: true } });
  let ok = 0;
  let failed = 0;

  for (const c of contracts) {
    try {
      await recomputeContractFinancials(c.id);
      ok += 1;
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${c.contractNo || c.id}: ${err.message}`);
    }
  }

  console.log(`[backfill-recompute] done — ${ok} recomputed, ${failed} failed`);
  await prisma.$disconnect();
})().catch((err) => {
  console.error("[backfill-recompute] aborted:", err);
  process.exit(0);
});
