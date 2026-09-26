-- Bireysel müşteri kartına doğum tarihi eklendi. Additive only.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "birthDate" TIMESTAMP(3);
