-- Per-category expiry/maintenance tracking switches on Vehicle. Default true
-- so every existing vehicle keeps being tracked exactly as before.
ALTER TABLE "Vehicle" ADD COLUMN "trackInsurance" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Vehicle" ADD COLUMN "trackKasko" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Vehicle" ADD COLUMN "trackTax" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Vehicle" ADD COLUMN "trackInspection" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Vehicle" ADD COLUMN "trackMaintenance" BOOLEAN NOT NULL DEFAULT true;
