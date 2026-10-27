CREATE TYPE "InspectionAppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "VehicleInspectionAppointment" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL,
    "appointmentAt" TIMESTAMP(3) NOT NULL,
    "station" TEXT,
    "bookingCode" TEXT,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "status" "InspectionAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleInspectionAppointment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VehicleInspectionAppointment_vehicleId_appointmentAt_idx"
ON "VehicleInspectionAppointment"("vehicleId", "appointmentAt");

CREATE INDEX "VehicleInspectionAppointment_status_appointmentAt_idx"
ON "VehicleInspectionAppointment"("status", "appointmentAt");

ALTER TABLE "VehicleInspectionAppointment"
ADD CONSTRAINT "VehicleInspectionAppointment_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
