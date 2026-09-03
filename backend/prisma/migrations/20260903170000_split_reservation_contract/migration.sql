-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('CREATED', 'CANCELLED', 'DONE');

-- AlterEnum
BEGIN;
CREATE TYPE "ReservationStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'CONVERTED');
ALTER TABLE "Reservation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Reservation" ALTER COLUMN "status" TYPE "ReservationStatus_new" USING ("status"::text::"ReservationStatus_new");
ALTER TYPE "ReservationStatus" RENAME TO "ReservationStatus_old";
ALTER TYPE "ReservationStatus_new" RENAME TO "ReservationStatus";
DROP TYPE "ReservationStatus_old";
ALTER TABLE "Reservation" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_referenceUserId_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_corporateId_fkey";

-- DropForeignKey
ALTER TABLE "ReservationExtension" DROP CONSTRAINT "ReservationExtension_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "ReservationDriver" DROP CONSTRAINT "ReservationDriver_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "ReservationPayment" DROP CONSTRAINT "ReservationPayment_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "ReservationExtra" DROP CONSTRAINT "ReservationExtra_reservationId_fkey";

-- DropIndex
DROP INDEX "Invoice_reservationId_key";

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "adminNote",
DROP COLUMN "corporateId",
DROP COLUMN "customerNote",
DROP COLUMN "dailyPrice",
DROP COLUMN "deposit",
DROP COLUMN "discount",
DROP COLUMN "discountDailyOnly",
DROP COLUMN "discountIsPercent",
DROP COLUMN "extrasTotal",
DROP COLUMN "flightNo",
DROP COLUMN "kmLimit",
DROP COLUMN "oneWayFee",
DROP COLUMN "referenceNo",
DROP COLUMN "referenceUserId",
DROP COLUMN "returnExtraAmount",
DROP COLUMN "totalPrice",
DROP COLUMN "unlimitedKm",
DROP COLUMN "vatRate",
ADD COLUMN     "note" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "reservationId",
ADD COLUMN     "contractId" TEXT NOT NULL;

-- DropTable
DROP TABLE "ReservationExtension";

-- DropTable
DROP TABLE "ReservationDriver";

-- DropTable
DROP TABLE "ReservationPayment";

-- DropTable
DROP TABLE "ReservationExtra";

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "pickUpLocation" TEXT NOT NULL,
    "dropOffLocation" TEXT NOT NULL,
    "pickUpTime" TIMESTAMP(3) NOT NULL,
    "dropOffTime" TIMESTAMP(3) NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'CREATED',
    "userId" TEXT NOT NULL,
    "referenceUserId" TEXT,
    "carId" TEXT NOT NULL,
    "corporateId" TEXT,
    "reservationId" TEXT,
    "customerNote" TEXT,
    "adminNote" TEXT,
    "referenceNo" TEXT,
    "flightNo" TEXT,
    "dailyPrice" DOUBLE PRECISION,
    "extrasTotal" DOUBLE PRECISION,
    "oneWayFee" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION,
    "discountIsPercent" BOOLEAN NOT NULL DEFAULT false,
    "discountDailyOnly" BOOLEAN NOT NULL DEFAULT true,
    "deposit" DOUBLE PRECISION,
    "returnExtraAmount" DOUBLE PRECISION,
    "kmLimit" INTEGER,
    "unlimitedKm" BOOLEAN NOT NULL DEFAULT true,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractExtension" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "previousDropOff" TIMESTAMP(3) NOT NULL,
    "newDropOff" TIMESTAMP(3) NOT NULL,
    "extraDays" INTEGER NOT NULL DEFAULT 0,
    "extraAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractExtension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDriver" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "licenseNo" TEXT,
    "licenseDate" TIMESTAMP(3),
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractPayment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'Cash',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractExtra" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "perDay" BOOLEAN NOT NULL DEFAULT true,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractExtra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contract_reservationId_key" ON "Contract"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_contractId_key" ON "Invoice"("contractId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_referenceUserId_fkey" FOREIGN KEY ("referenceUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_corporateId_fkey" FOREIGN KEY ("corporateId") REFERENCES "Corporate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractExtension" ADD CONSTRAINT "ContractExtension_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDriver" ADD CONSTRAINT "ContractDriver_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractPayment" ADD CONSTRAINT "ContractPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractExtra" ADD CONSTRAINT "ContractExtra_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

