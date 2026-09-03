-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "referenceUserId" TEXT;

-- CreateIndex
CREATE INDEX "Reservation_referenceUserId_idx" ON "Reservation"("referenceUserId");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_referenceUserId_fkey" FOREIGN KEY ("referenceUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
