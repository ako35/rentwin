-- Itemised return-time charges (HGS/OGS, km excess, damage, roadside, cleaning,
-- fuel difference, other). Additive-only, new table. The summed line totals are
-- cached on Contract.returnExtraAmount by the application layer.

-- CreateTable
CREATE TABLE "ContractReturnCharge" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractReturnCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractReturnCharge_contractId_idx" ON "ContractReturnCharge"("contractId");

-- AddForeignKey
ALTER TABLE "ContractReturnCharge" ADD CONSTRAINT "ContractReturnCharge_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
