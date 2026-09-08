const prisma = require("../../lib/prisma");
const { round2 } = require("../../lib/dates");
const { pricePeriod } = require("./contract-fields");
const { syncContractDebit } = require("../../lib/ledger");

// The current per-unit rate configured on the contract (edited from the pricing
// card): monthlyPrice in MONTHLY mode, dailyPrice in DAILY mode.
const contractUnitPrice = (contract) =>
  (contract.rentalType === "MONTHLY" ? contract.monthlyPrice : contract.dailyPrice) || 0;

// Single definition of "a contract's cached financials are consistent" and the
// sole owner of the ContractPeriod lifecycle:
//   - a contract with a rate but no periods gets period #1 [pickUp, dropOff]
//   - the one ACTIVE period (highest sequence) is re-priced from the contract's
//     current rate + drop-off; CLOSED periods are frozen snapshots
//   - Σ return-charge lines            -> Contract.returnExtraAmount
//   - Σ period gross + add-ons         -> Contract.totalPrice
//   - grand total                      -> the AUTO_CONTRACT ledger debit
// Callable inside a transaction (pass the tx client). Errors propagate.
const recomputeContractFinancials = async (contractId, client = prisma) => {
  const contract = await client.contract.findUnique({ where: { id: contractId } });
  if (!contract) return null;

  const vatRate = contract.vatRate ?? 20;
  const unitPrice = contractUnitPrice(contract);
  let periods = await client.contractPeriod.findMany({
    where: { contractId },
    orderBy: { sequence: "asc" },
  });

  if (periods.length === 0) {
    // First real save with a rate set — open period #1 for the base window.
    if (unitPrice > 0) {
      const priced = pricePeriod({
        rentalType: contract.rentalType,
        unitPrice,
        start: contract.pickUpTime,
        end: contract.dropOffTime,
        vatRate,
      });
      await client.contractPeriod.create({
        data: {
          contractId,
          sequence: 1,
          startAt: contract.pickUpTime,
          endAt: contract.dropOffTime,
          rentalType: contract.rentalType,
          unitPrice,
          vatRate,
          status: "ACTIVE",
          ...priced,
        },
      });
    }
  } else {
    // Re-price the single ACTIVE period from the contract's current rate and
    // drop-off. Closed periods and operator-priced periods are never touched.
    const active = [...periods].reverse().find((p) => p.status === "ACTIVE");
    if (active && !active.manualPrice) {
      const priced = pricePeriod({
        rentalType: contract.rentalType,
        unitPrice,
        start: active.startAt,
        end: contract.dropOffTime,
        vatRate,
      });
      await client.contractPeriod.update({
        where: { id: active.id },
        data: {
          endAt: contract.dropOffTime,
          rentalType: contract.rentalType,
          unitPrice,
          vatRate,
          ...priced,
        },
      });
    }
  }

  periods = await client.contractPeriod.findMany({ where: { contractId } });
  const rentalGross = round2(periods.reduce((sum, p) => sum + (p.grossAmount || 0), 0));

  const rows = await client.contractReturnCharge.findMany({ where: { contractId } });
  const returnExtraAmount = round2(
    rows.reduce((sum, r) => sum + (r.amount || 0) * (r.quantity || 1), 0)
  );

  const addOns = (contract.oneWayFee || 0) + (contract.extrasTotal || 0);
  const totalPrice = round2(rentalGross + returnExtraAmount + addOns);

  const updated = await client.contract.update({
    where: { id: contractId },
    data: { returnExtraAmount, totalPrice },
  });

  await syncContractDebit(updated, client);
  return updated;
};

module.exports = { recomputeContractFinancials, contractUnitPrice };
