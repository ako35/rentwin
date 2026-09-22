-- Track whether the printed contract has been signed, KABİS-style: a
-- signed-date + who marked it, stamped server-side on the null -> set
-- transition. Additive only.

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN "signedAt" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN "signedBy" TEXT;
