-- Yönetici Notu now stamps who wrote it and when, so the note reads like a
-- log entry instead of an unattributed text box. Additive only.

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN "adminNoteAt" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN "adminNoteBy" TEXT;
