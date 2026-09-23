-- Per-category day window for the dashboard's expiry alert panel (Sigorta/
-- Kasko/MTV/Muayene), configurable from Ayarlar. Additive; null keeps the
-- previous hardcoded 15-day default (see vehicles.dashboard.controller.js).

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN "alertWindowInspectionDays" INTEGER,
ADD COLUMN "alertWindowInsuranceDays" INTEGER,
ADD COLUMN "alertWindowKaskoDays" INTEGER,
ADD COLUMN "alertWindowTaxDays" INTEGER;
