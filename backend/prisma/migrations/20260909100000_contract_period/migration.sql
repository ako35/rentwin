-- Contract billing periods ("A Yöntemi" — dönemsel bağımsız faturalandırma).
-- Period #1 is the base rental; each extension closes the active period and
-- opens the next. Additive — a brand-new table; existing contracts get their
-- period #1 from backfill-contract-periods.js.

CREATE TABLE "ContractPeriod" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "rentalType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "months" INTEGER NOT NULL DEFAULT 0,
    "kistDays" INTEGER NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "grossAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manualPrice" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractPeriod_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractPeriod_contractId_idx" ON "ContractPeriod"("contractId");

CREATE UNIQUE INDEX "ContractPeriod_contractId_sequence_key" ON "ContractPeriod"("contractId", "sequence");

ALTER TABLE "ContractPeriod" ADD CONSTRAINT "ContractPeriod_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
