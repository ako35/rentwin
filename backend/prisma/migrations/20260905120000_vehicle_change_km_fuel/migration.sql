-- AlterTable
ALTER TABLE "ContractVehicleChange"
  ADD COLUMN "returnKm" INTEGER,
  ADD COLUMN "returnFuelEighths" INTEGER,
  ADD COLUMN "newCarKm" INTEGER,
  ADD COLUMN "newCarFuelEighths" INTEGER;
