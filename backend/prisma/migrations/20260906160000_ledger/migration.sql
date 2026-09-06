-- Double-entry current-account ledger (Cari Defter). New table + enums, then a
-- one-time SQL backfill from existing contracts and contract payments so the
-- ledger is the complete picture from day one.

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "LedgerSource" AS ENUM ('MANUAL', 'AUTO_CONTRACT', 'AUTO_PAYMENT');

-- CreateEnum
CREATE TYPE "LedgerCategory" AS ENUM ('RENTAL', 'EXTRA', 'TRAFFIC_FINE', 'DAMAGE', 'FUEL', 'MANUAL_DEBIT', 'PAYMENT', 'REFUND', 'DISCOUNT', 'MANUAL_CREDIT');

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" "LedgerDirection" NOT NULL,
    "category" "LedgerCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "method" TEXT,
    "contractId" TEXT,
    "contractPaymentId" TEXT,
    "invoiceNo" TEXT,
    "source" "LedgerSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_contractPaymentId_key" ON "LedgerEntry"("contractPaymentId");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_date_idx" ON "LedgerEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: one RENTAL debit per non-cancelled contract with a positive total,
-- billed to the reference account when present, otherwise the driver.
INSERT INTO "LedgerEntry" ("id", "userId", "date", "direction", "category", "amount", "contractId", "source", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       COALESCE("referenceUserId", "userId"),
       "createdAt",
       'DEBIT',
       'RENTAL',
       "totalPrice",
       "id",
       'AUTO_CONTRACT',
       now(),
       now()
FROM "Contract"
WHERE "status" <> 'CANCELLED' AND "totalPrice" > 0;

-- Backfill: mirror each contract payment as a PAYMENT credit on the same account.
INSERT INTO "LedgerEntry" ("id", "userId", "date", "direction", "category", "amount", "method", "description", "contractId", "contractPaymentId", "source", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       COALESCE(c."referenceUserId", c."userId"),
       p."paidAt",
       'CREDIT',
       'PAYMENT',
       p."amount",
       p."method",
       p."note",
       p."contractId",
       p."id",
       'AUTO_PAYMENT',
       now(),
       now()
FROM "ContractPayment" p
JOIN "Contract" c ON c."id" = p."contractId"
WHERE c."status" <> 'CANCELLED';
