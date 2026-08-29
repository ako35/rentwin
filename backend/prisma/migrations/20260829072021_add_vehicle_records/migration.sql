-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('Owned', 'Rented', 'OperationalLease');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('Traffic', 'Kasko');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('Periodic', 'Repair', 'Tire', 'Other');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('Periodic', 'Emission');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('Pass', 'Fail', 'Defective');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "chassisNo" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "currentKm" INTEGER,
ADD COLUMN     "engineNo" TEXT,
ADD COLUMN     "modelYear" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "ownershipType" "OwnershipType",
ADD COLUMN     "registrationDate" TIMESTAMP(3),
ADD COLUMN     "registrationSerialNo" TEXT;

-- CreateTable
CREATE TABLE "VehicleInsurance" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "InsuranceType" NOT NULL,
    "company" TEXT NOT NULL,
    "policyNo" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "premium" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleInsurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleTax" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "installment" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleTax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMaintenance" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL DEFAULT 'Periodic',
    "date" TIMESTAMP(3) NOT NULL,
    "odometer" INTEGER,
    "vendor" TEXT,
    "description" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "nextDate" TIMESTAMP(3),
    "nextOdometer" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleInspection" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL DEFAULT 'Periodic',
    "date" TIMESTAMP(3) NOT NULL,
    "result" "InspectionResult" NOT NULL DEFAULT 'Pass',
    "expiryDate" TIMESTAMP(3),
    "station" TEXT,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleInspection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VehicleInsurance" ADD CONSTRAINT "VehicleInsurance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTax" ADD CONSTRAINT "VehicleTax_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
