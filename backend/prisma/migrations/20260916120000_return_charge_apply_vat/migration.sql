-- HGS/OGS and other return-time charges sometimes need VAT added on top of
-- the entered amount, sometimes not — let the operator choose per line
-- instead of assuming one way. Additive: one NOT NULL column with a default.

ALTER TABLE "ContractReturnCharge" ADD COLUMN "applyVat" BOOLEAN NOT NULL DEFAULT false;
