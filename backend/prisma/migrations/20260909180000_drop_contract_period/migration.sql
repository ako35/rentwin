-- Drop the "A Yöntemi" period model. Extensions go back to being flat,
-- operator-priced add-on lines (ContractExtension), and are now deletable.
--
-- ContractPeriod was introduced earlier this session; its data is folded back
-- into ContractExtension so Contract.totalPrice is unchanged:
--   period #1        -> the base rental (stays on the Contract, not moved)
--   period #2..N     -> one ContractExtension row each

ALTER TABLE "ContractExtension" ADD COLUMN "months" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ContractExtension" ADD COLUMN "extraAmountNet" DOUBLE PRECISION;

INSERT INTO "ContractExtension"
  ("id", "contractId", "previousDropOff", "newDropOff", "extraDays", "months",
   "extraAmount", "extraAmountNet", "note", "createdAt")
SELECT
  gen_random_uuid(), "contractId", "startAt", "endAt", "kistDays", "months",
  "grossAmount", "netAmount", "note", "createdAt"
FROM "ContractPeriod"
WHERE "sequence" > 1;

DROP TABLE "ContractPeriod";
