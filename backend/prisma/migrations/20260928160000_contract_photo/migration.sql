-- Mobil uygulamadan çekilen araç teslim/iade fotoğrafları için depolama. Additive only.
-- CreateEnum
CREATE TYPE "ContractPhotoStage" AS ENUM ('PICKUP', 'RETURN');
CREATE TYPE "ContractPhotoAngle" AS ENUM ('FRONT', 'BACK', 'LEFT', 'RIGHT', 'DASHBOARD', 'DAMAGE', 'OTHER');

-- CreateTable
CREATE TABLE "ContractPhoto" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "stage" "ContractPhotoStage" NOT NULL,
    "angle" "ContractPhotoAngle" NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "takenById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractPhoto_contractId_idx" ON "ContractPhoto"("contractId");
CREATE INDEX "ContractPhoto_contractId_stage_idx" ON "ContractPhoto"("contractId", "stage");
CREATE INDEX "ContractPhoto_takenById_idx" ON "ContractPhoto"("takenById");

-- AddForeignKey
ALTER TABLE "ContractPhoto" ADD CONSTRAINT "ContractPhoto_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractPhoto" ADD CONSTRAINT "ContractPhoto_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
