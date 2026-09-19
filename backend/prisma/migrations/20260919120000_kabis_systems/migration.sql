-- KABİS portals move from two fixed Setting columns to an operator-managed
-- list (add/delete from Ayarlar). Existing names are carried forward as seed
-- rows before the old columns are dropped, so nothing already picked from
-- them (Contract.kbsSystem snapshots) needs touching.

-- CreateTable
CREATE TABLE "KabisSystem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KabisSystem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KabisSystem_name_key" ON "KabisSystem"("name");

-- Seed from the existing Setting row, if any.
INSERT INTO "KabisSystem" ("id", "name")
SELECT gen_random_uuid()::text, "kabisSystem1Name" FROM "Setting"
WHERE "kabisSystem1Name" IS NOT NULL AND "kabisSystem1Name" <> ''
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "KabisSystem" ("id", "name")
SELECT gen_random_uuid()::text, "kabisSystem2Name" FROM "Setting"
WHERE "kabisSystem2Name" IS NOT NULL AND "kabisSystem2Name" <> ''
ON CONFLICT ("name") DO NOTHING;

-- AlterTable
ALTER TABLE "Setting" DROP COLUMN "kabisSystem1Name";
ALTER TABLE "Setting" DROP COLUMN "kabisSystem2Name";
