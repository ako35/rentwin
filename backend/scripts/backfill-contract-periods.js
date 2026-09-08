// One-off backfill: give every pre-"A Yöntemi" contract its ContractPeriod
// chain, then recompute financials.
//
//   - no extensions  -> one ACTIVE period [pickUp, dropOff]
//   - N extensions   -> period #1 [pickUp, ext0.previousDropOff] + one period
//                       per extension [ext.previousDropOff, ext.newDropOff];
//                       the last is ACTIVE, the rest CLOSED
//
// Each period is priced with the contract's CURRENT rate (historical rates are
// not stored) via pricePeriod, so monthly contracts also pick up the new
// net -> gross VAT rule. recomputeContractFinancials then re-syncs totalPrice +
// the AUTO_CONTRACT ledger debit. Idempotent — skips contracts that already
// have periods. Runs during the Vercel build after migrate-on-deploy; a
// follow-up commit drops it from postinstall once it has run in production.
try {
  require("dotenv").config();
} catch {
  /* dotenv missing during a cold install — env vars still work */
}

if (!process.env.VERCEL) {
  console.log("[backfill-periods] not a Vercel build — skipping (run by hand against dev)");
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.log("[backfill-periods] no DATABASE_URL — skipping");
  process.exit(0);
}

(async () => {
  const prisma = require("../src/lib/prisma");
  const { pricePeriod } = require("../src/modules/contracts/contract-fields");
  const { recomputeContractFinancials, contractUnitPrice } = require("../src/modules/contracts/contract-financials");

  const contracts = await prisma.contract.findMany({
    include: {
      periods: { select: { id: true } },
      extensions: { orderBy: { createdAt: "asc" } },
    },
  });

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const c of contracts) {
    if (c.periods.length > 0) {
      skipped += 1;
      continue;
    }
    try {
      const vatRate = c.vatRate ?? 20;
      const unitPrice = contractUnitPrice(c);

      // Build the [start, end] windows.
      const windows = [];
      if (c.extensions.length > 0) {
        windows.push([c.pickUpTime, c.extensions[0].previousDropOff]);
        for (const ext of c.extensions) windows.push([ext.previousDropOff, ext.newDropOff]);
      } else {
        windows.push([c.pickUpTime, c.dropOffTime]);
      }

      // Nothing to price and no history -> let recompute decide (creates none).
      if (unitPrice <= 0 && c.extensions.length === 0) {
        await recomputeContractFinancials(c.id);
        skipped += 1;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < windows.length; i += 1) {
          const [start, end] = windows[i];
          const priced = pricePeriod({ rentalType: c.rentalType, unitPrice, start, end, vatRate });
          await tx.contractPeriod.create({
            data: {
              contractId: c.id,
              sequence: i + 1,
              startAt: start,
              endAt: end,
              rentalType: c.rentalType,
              unitPrice,
              vatRate,
              status: i === windows.length - 1 ? "ACTIVE" : "CLOSED",
              ...priced,
            },
          });
        }
        await recomputeContractFinancials(c.id, tx);
      });
      created += 1;
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${c.contractNo || c.id}: ${err.message}`);
    }
  }

  console.log(
    `[backfill-periods] done — ${created} backfilled, ${skipped} skipped, ${failed} failed`
  );
  await prisma.$disconnect();
})().catch((err) => {
  // Never fail the build over a backfill — log loudly, it can be re-run.
  console.error("[backfill-periods] aborted:", err);
  process.exit(0);
});
