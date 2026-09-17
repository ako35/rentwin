-- Two KABİS portals are used in parallel; the operator now records which one
-- a given rental was filed under, and names both in Setting. Additive only.

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN "kbsSystem" TEXT;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN "kabisSystem1Name" TEXT NOT NULL DEFAULT 'Sistem 1';
ALTER TABLE "Setting" ADD COLUMN "kabisSystem2Name" TEXT NOT NULL DEFAULT 'Sistem 2';
