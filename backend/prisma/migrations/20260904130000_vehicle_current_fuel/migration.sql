-- Current fuel / charge level of the vehicle, 0-100 (%), stored alongside
-- currentKm. Nullable; entered/updated from the admin vehicle form.

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "currentFuelPercent" INTEGER;
