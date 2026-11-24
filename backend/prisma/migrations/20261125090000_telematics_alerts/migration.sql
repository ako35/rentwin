-- GPS takip Faz 3: km eşitleme, ofis varlığı, uyarılar. Yalnızca ekleme.

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "trackerOdometerKm" INTEGER,
ADD COLUMN "trackerOdometerAt" TIMESTAMP(3),
ADD COLUMN "trackerKmOffset" INTEGER,
ADD COLUMN "trackerKmAnchorKm" INTEGER,
ADD COLUMN "trackerKmCalibratedAt" TIMESTAMP(3),
ADD COLUMN "trackerAtOffice" BOOLEAN;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN "gpsAlertEmails" TEXT,
ADD COLUMN "gpsOverspeedKmh" INTEGER,
ADD COLUMN "gpsKmLimitWarnPercent" INTEGER,
ADD COLUMN "gpsLateReturnGraceMinutes" INTEGER,
ADD COLUMN "gpsOfflineHours" INTEGER,
ADD COLUMN "gpsOfficeLat" DOUBLE PRECISION,
ADD COLUMN "gpsOfficeLng" DOUBLE PRECISION,
ADD COLUMN "gpsOfficeRadiusM" INTEGER,
ADD COLUMN "gpsOutOfRegionKm" INTEGER,
ADD COLUMN "gpsLastTickAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TelematicsAlert" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "contractId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "data" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "acknowledgedByName" TEXT,
    "emailedAt" TIMESTAMP(3),

    CONSTRAINT "TelematicsAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelematicsAlert_dedupeKey_key" ON "TelematicsAlert"("dedupeKey");

-- CreateIndex
CREATE INDEX "TelematicsAlert_acknowledgedAt_occurredAt_idx" ON "TelematicsAlert"("acknowledgedAt", "occurredAt");

-- CreateIndex
CREATE INDEX "TelematicsAlert_vehicleId_occurredAt_idx" ON "TelematicsAlert"("vehicleId", "occurredAt");

-- AddForeignKey
ALTER TABLE "TelematicsAlert" ADD CONSTRAINT "TelematicsAlert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
