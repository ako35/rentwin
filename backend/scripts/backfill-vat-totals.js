// One-off backfill: recompute every contract's cached financials so the grand
// total and the AUTO_CONTRACT ledger debit follow the VAT-inclusive pricing
// rule (prices are entered VAT-inclusive; no VAT is added on top). Contracts
// saved before that change carry a total inflated by the old ×(1+vatRate/100).
//
// recomputeContractFinancials rebuilds returnExtraAmount + totalPrice from the
// source fields and re-syncs the ledger, so this is idempotent — safe to run
// again. Runs during the Vercel build, right after migrate-on-deploy; a
// follow-up commit drops it from postinstall once it has run in production.
try {
  require("dotenv").config();
} catch {
  /* dotenv missing during a cold install — env vars still work */
}

if (!process.env.VERCEL) {
  console.log("[backfill-vat-totals] not a Vercel build — skipping (run by hand against dev)");
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.log("[backfill-vat-totals] no DATABASE_URL — skipping");
  process.exit(0);
}

(async () => {
  const prisma = require("../src/lib/prisma");
  const { recomputeContractFinancials } = require("../src/modules/contracts/contract-financials");

  const contracts = await prisma.contract.findMany({ select: { id: true, contractNo: true } });
  console.log(`[backfill-vat-totals] recomputing ${contracts.length} contract(s)…`);

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

  console.log(`[backfill-vat-totals] done — ${ok} ok, ${failed} failed`);
  await prisma.$disconnect();
})().catch((err) => {
  // Never fail the build over a backfill — log loudly, it can be re-run.
  console.error("[backfill-vat-totals] aborted:", err);
  process.exit(0);
});
