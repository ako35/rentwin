-- Mid-contract vehicle swap history. Additive-only, new table.

-- CreateTable
CREATE TABLE "ContractVehicleChange" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "changeDate" TIMESTAMP(3) NOT NULL,
    "previousCarId" TEXT NOT NULL,
    "previousCarLabel" TEXT NOT NULL,
    "newCarId" TEXT NOT NULL,
    "newCarLabel" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractVehicleChange_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContractVehicleChange" ADD CONSTRAINT "ContractVehicleChange_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
