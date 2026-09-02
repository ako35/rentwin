-- AlterTable
ALTER TABLE "User" ADD COLUMN "customerType" TEXT NOT NULL DEFAULT 'Bireysel';
ALTER TABLE "User" ADD COLUMN "companyTitle" TEXT;
ALTER TABLE "User" ADD COLUMN "taxOffice" TEXT;
