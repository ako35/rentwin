-- AlterEnum: Transmission values (Automatic/Manual/Tiptronic -> Manual/SemiAutomatic/Automatic)
BEGIN;
CREATE TYPE "Transmission_new" AS ENUM ('Manual', 'SemiAutomatic', 'Automatic');
ALTER TABLE "Vehicle" ALTER COLUMN "transmission" TYPE "Transmission_new" USING ("transmission"::text::"Transmission_new");
ALTER TYPE "Transmission" RENAME TO "Transmission_old";
ALTER TYPE "Transmission_new" RENAME TO "Transmission";
DROP TYPE "Transmission_old";
COMMIT;

-- DropColumn: fields no longer tracked on Vehicle
ALTER TABLE "Vehicle" DROP COLUMN "doors";
ALTER TABLE "Vehicle" DROP COLUMN "seats";
ALTER TABLE "Vehicle" DROP COLUMN "luggage";
ALTER TABLE "Vehicle" DROP COLUMN "age";
ALTER TABLE "Vehicle" DROP COLUMN "airConditioning";
ALTER TABLE "Vehicle" DROP COLUMN "pricePerHour";
