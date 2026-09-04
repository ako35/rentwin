-- Fuel / charge level as a gauge reading in eighths (0-8), not a percentage.
-- Replaces the short-lived currentFuelPercent column (no real data yet).

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN IF EXISTS "currentFuelPercent";
ALTER TABLE "Vehicle" ADD COLUMN "currentFuelEighths" INTEGER;
