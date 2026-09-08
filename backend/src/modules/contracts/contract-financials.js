const prisma = require("../../lib/prisma");
const { round2 } = require("../../lib/dates");
const { computeTotal } = require("./contract-fields");
const { syncContractDebit } = require("../../lib/ledger");

// Single definition of "a contract's cached financials are consistent":
//   Σ return-charge lines           -> Contract.returnExtraAmount
//   rental + add-ons (VAT-inclusive) -> Contract.totalPrice   (via computeTotal)
//   grand total                      -> the AUTO_CONTRACT ledger debit
// Callable inside a transaction (pass the tx client). Errors propagate — the
// caller decides how to handle them.
const recomputeContractFinancials = async (contractId, client = prisma) => {
  const contract = await client.contract.findUnique({ where: { id: contractId } });
  if (!contract) return null;

  const rows = await client.contractReturnCharge.findMany({ where: { contractId } });
  const returnExtraAmount = round2(
    rows.reduce((sum, r) => sum + (r.amount || 0) * (r.quantity || 1), 0)
  );

  const totalPrice = computeTotal(
    { ...contract, returnExtraAmount },
    contract.pickUpTime,
    contract.dropOffTime
  );

  const updated = await client.contract.update({
    where: { id: contractId },
    data: { returnExtraAmount, totalPrice },
  });

  await syncContractDebit(updated, client);
  return updated;
};

module.exports = { recomputeContractFinancials };
