-- Fuel / charge level as a gauge reading in eighths (0-8), replacing the
-- percentage input. Additive only: currentFuelPercent is left in place (unused)
-- so this migration is safe to apply while the previous code version is still
-- serving. A later migration drops currentFuelPercent.

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "currentFuelEighths" INTEGER;
