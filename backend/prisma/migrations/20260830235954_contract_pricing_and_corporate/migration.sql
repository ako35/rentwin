-- CreateTable
CREATE TABLE "Corporate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taxOffice" TEXT,
    "taxNo" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "note" TEXT,
    "blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Corporate_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "corporateId" TEXT,
ADD COLUMN "dailyPrice" DOUBLE PRECISION,
ADD COLUMN "extrasTotal" DOUBLE PRECISION,
ADD COLUMN "oneWayFee" DOUBLE PRECISION,
ADD COLUMN "discount" DOUBLE PRECISION,
ADD COLUMN "deposit" DOUBLE PRECISION,
ADD COLUMN "kmLimit" INTEGER,
ADD COLUMN "unlimitedKm" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_corporateId_fkey" FOREIGN KEY ("corporateId") REFERENCES "Corporate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
