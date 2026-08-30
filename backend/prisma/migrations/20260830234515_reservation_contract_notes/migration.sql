-- AddColumn: lightweight contract fields
ALTER TABLE "Reservation" ADD COLUMN "customerNote" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "referenceNo" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "flightNo" TEXT;
