-- Kesilen faturanın kendisini PDF olarak saklayabilmek için. Additive only.
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "pdfUrl" TEXT, ADD COLUMN "pdfPathname" TEXT;
