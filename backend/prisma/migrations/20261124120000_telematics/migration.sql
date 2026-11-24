-- GPS takip, ilk sürüm (docs/gps-takip-yol-haritasi.md, Faz 2). Additive only.
-- Koordinat tutulmaz: konum geçmişi Türkiye'deki Traccar sunucusunda kalır.

ALTER TABLE "Vehicle" ADD COLUMN "trackerImei" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "trackerLastSeenAt" TIMESTAMP(3);
ALTER TABLE "Vehicle" ADD COLUMN "trackerIgnitionOn" BOOLEAN;
CREATE UNIQUE INDEX "Vehicle_trackerImei_key" ON "Vehicle"("trackerImei");

CREATE TABLE "TelematicsEvent" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "traccarEventId" INTEGER,
    "type" TEXT NOT NULL,
    "alarm" TEXT,
    "geofenceName" TEXT,
    "speedKmh" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelematicsEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TelematicsEvent_traccarEventId_key" ON "TelematicsEvent"("traccarEventId");
CREATE INDEX "TelematicsEvent_vehicleId_occurredAt_idx" ON "TelematicsEvent"("vehicleId", "occurredAt");
ALTER TABLE "TelematicsEvent" ADD CONSTRAINT "TelematicsEvent_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TelematicsAccessLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "contractId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "rangeFrom" TIMESTAMP(3),
    "rangeTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelematicsAccessLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TelematicsAccessLog_vehicleId_createdAt_idx" ON "TelematicsAccessLog"("vehicleId", "createdAt");
CREATE INDEX "TelematicsAccessLog_actorId_vehicleId_createdAt_idx" ON "TelematicsAccessLog"("actorId", "vehicleId", "createdAt");
ALTER TABLE "TelematicsAccessLog" ADD CONSTRAINT "TelematicsAccessLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
