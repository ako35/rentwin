-- Evrakların belirli sigorta/vergi/bakım/muayene kayıtlarına bağlanabilmesi
-- için nullable FK sütunları. Additive only, mevcut (genel) evraklar etkilenmez.
-- AlterTable
ALTER TABLE "VehicleDocument"
  ADD COLUMN "insuranceId" TEXT,
  ADD COLUMN "taxId" TEXT,
  ADD COLUMN "maintenanceId" TEXT,
  ADD COLUMN "inspectionId" TEXT;

-- CreateIndex
CREATE INDEX "VehicleDocument_insuranceId_idx" ON "VehicleDocument"("insuranceId");
CREATE INDEX "VehicleDocument_taxId_idx" ON "VehicleDocument"("taxId");
CREATE INDEX "VehicleDocument_maintenanceId_idx" ON "VehicleDocument"("maintenanceId");
CREATE INDEX "VehicleDocument_inspectionId_idx" ON "VehicleDocument"("inspectionId");

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "VehicleInsurance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "VehicleTax"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "VehicleMaintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "VehicleInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
