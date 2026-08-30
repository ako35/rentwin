-- CreateTable
CREATE TABLE "ReservationDriver" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "licenseNo" TEXT,
    "licenseDate" TIMESTAMP(3),
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationDriver_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReservationDriver" ADD CONSTRAINT "ReservationDriver_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
