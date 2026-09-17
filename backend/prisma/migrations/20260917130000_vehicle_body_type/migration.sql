-- Body type per vehicle, used to pick the matching four-view drawing on the
-- Araç Teslim/İade Tutanağı (previously one generic sedan/hatchback drawing
-- for every vehicle). Additive; existing fleet defaults to BINEK, which keeps
-- printing the same drawing it already did until re-classified.

-- CreateEnum
CREATE TYPE "VehicleBodyType" AS ENUM ('BINEK', 'SUV', 'PANELVAN_MINIBUS', 'KAMYONET');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "bodyType" "VehicleBodyType" NOT NULL DEFAULT 'BINEK';
