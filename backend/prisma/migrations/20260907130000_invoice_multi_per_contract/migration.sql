-- Allow more than one invoice per contract. Drop the 1:1 unique index on
-- Invoice.contractId and replace it with a plain index for the per-contract
-- list query. The global unique on Invoice.number stays; the FK stays. Safe
-- relaxation — no rows are touched.

DROP INDEX "Invoice_contractId_key";

CREATE INDEX "Invoice_contractId_idx" ON "Invoice"("contractId");
