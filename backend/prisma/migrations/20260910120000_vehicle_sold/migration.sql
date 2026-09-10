-- Sold-vehicle lifecycle.
--
-- Vehicle.soldAt / saleNote: a sold vehicle is retired from the fleet (hidden
-- from the public site and every new rental) but kept on record. A scheduled
-- job hard-deletes it 5 years after soldAt, together with its rental paperwork
-- (contracts, reservations, invoices, sub-records) — but never the customer
-- ledger.
--
-- LedgerEntry.contractNo: a text snapshot of the linked contract's number.
-- LedgerEntry.contractId is ON DELETE SET NULL, so when a contract is purged
-- with its vehicle the ledger row survives; this column keeps the row readable
-- (which rental it was for) after the link is gone.

ALTER TABLE "Vehicle" ADD COLUMN "soldAt" TIMESTAMP(3);
ALTER TABLE "Vehicle" ADD COLUMN "saleNote" TEXT;

ALTER TABLE "LedgerEntry" ADD COLUMN "contractNo" TEXT;
