-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "discountIsPercent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "returnExtraAmount" DOUBLE PRECISION;
