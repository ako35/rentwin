-- Km-based window for the dashboard's "Bakım" alert (Periyodik bakım kaydının
-- nextOdometer'ı ile aracın currentKm'i arasındaki fark bu değerin altına
-- düşünce uyarı verilir), configurable from Ayarlar. Additive; null keeps the
-- previous hardcoded 1000 km default (see vehicles.dashboard.controller.js).

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN "alertWindowMaintenanceKm" INTEGER;
