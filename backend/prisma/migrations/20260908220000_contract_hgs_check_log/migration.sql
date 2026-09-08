-- HGS/OGS check audit log: one row per queried date range, with who ran it and
-- when. Replaces the single contract-level hgsChecked* columns (left dead).
-- Additive — a brand-new table.

CREATE TABLE "ContractHgsCheck" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "rangeFrom" TIMESTAMP(3) NOT NULL,
    "rangeTo" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "checkedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractHgsCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractHgsCheck_contractId_idx" ON "ContractHgsCheck"("contractId");

ALTER TABLE "ContractHgsCheck" ADD CONSTRAINT "ContractHgsCheck_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
