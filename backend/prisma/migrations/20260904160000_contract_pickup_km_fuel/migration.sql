-- Odometer + fuel/charge gauge at hand-over, captured on the contract.
-- Prefilled from the vehicle's currentKm / currentFuelEighths when the car is
-- picked, editable per contract. Additive — safe during the deploy cutover.

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN "pickUpKm" INTEGER;
ALTER TABLE "Contract" ADD COLUMN "pickUpFuelEighths" INTEGER;
