-- GPS takip: Traccar event ids restart from 1 when Traccar is reinstalled, so
-- dedupe on (event id, vehicle, event time) instead of the id alone.

-- DropIndex
DROP INDEX "TelematicsEvent_traccarEventId_key";

-- CreateIndex
CREATE UNIQUE INDEX "TelematicsEvent_traccarEventId_vehicleId_occurredAt_key" ON "TelematicsEvent"("traccarEventId", "vehicleId", "occurredAt");
