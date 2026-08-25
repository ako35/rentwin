-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "brand" TEXT NOT NULL,
ADD COLUMN     "licensePlate" TEXT NOT NULL,
ADD COLUMN     "outOfService" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_licensePlate_key" ON "Vehicle"("licensePlate");
