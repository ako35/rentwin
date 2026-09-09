const prisma = require("../../lib/prisma");
const { round2 } = require("../../lib/dates");
const { pricePeriod } = require("./contract-fields");
const { syncContractDebit } = require("../../lib/ledger");

// The current per-unit rate configured on the contract (edited from the pricing
// card): monthlyPrice in MONTHLY mode, dailyPrice in DAILY mode.
const contractUnitPrice = (contract) =>
  (contract.rentalType === "MONTHLY" ? contract.monthlyPrice : contract.dailyPrice) || 0;

// Single definition of "a contract's cached financials are consistent":
//   base rental  = price of [pickUp, <drop-off before the first extension>]
//                  at the contract's current rate
//   + Σ extension.extraAmount     (flat, operator-priced add-on lines)
//   + Σ return-charge lines       -> Contract.returnExtraAmount
//   + one-way fee + extras
//   = Contract.totalPrice         -> the AUTO_CONTRACT ledger debit
// Extensions never re-price anything. Callable inside a transaction (pass tx).
const recomputeContractFinancials = async (contractId, client = prisma) => {
  const contract = await client.contract.findUnique({ where: { id: contractId } });
  if (!contract) return null;

  const vatRate = contract.vatRate ?? 20;
  const unitPrice = contractUnitPrice(contract);

  const extensions = await client.contractExtension.findMany({
    where: { contractId },
    orderBy: { createdAt: "asc" },
  });

  // The base rental window ends where the drop-off was before the first
  // extension — extensions push Contract.dropOffTime but not the base price.
  const baseEnd = extensions.length
    ? extensions.reduce(
        (min, e) => (e.previousDropOff < min ? e.previousDropOff : min),
        extensions[0].previousDropOff
      )
    : contract.dropOffTime;

  const base =
    unitPrice > 0
      ? pricePeriod({
          rentalType: contract.rentalType,
          unitPrice,
          start: contract.pickUpTime,
          end: baseEnd,
          vatRate,
        })
      : { netAmount: 0, grossAmount: 0 };

  const extensionsGross = round2(extensions.reduce((sum, e) => sum + (e.extraAmount || 0), 0));

  const rows = await client.contractReturnCharge.findMany({ where: { contractId } });
  const returnExtraAmount = round2(
    rows.reduce((sum, r) => sum + (r.amount || 0) * (r.quantity || 1), 0)
  );

  const addOns = (contract.oneWayFee || 0) + (contract.extrasTotal || 0);
  const totalPrice = round2(base.grossAmount + extensionsGross + returnExtraAmount + addOns);

  const updated = await client.contract.update({
    where: { id: contractId },
    data: { returnExtraAmount, totalPrice },
  });

  await syncContractDebit(updated, client);
  return updated;
};

module.exports = { recomputeContractFinancials, contractUnitPrice };
