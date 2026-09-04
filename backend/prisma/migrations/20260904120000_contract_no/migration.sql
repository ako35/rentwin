-- Human-readable sequential contract number: K-<year>-<00001>, assigned on
-- create (see contract-fields.nextContractNo). Nullable so pre-existing rows
-- and any future edge case are tolerated; new contracts always get one.

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN "contractNo" TEXT;

-- Backfill existing rows in creation order, restarting the counter each year.
WITH numbered AS (
  SELECT
    "id",
    'K-' || to_char("createdAt", 'YYYY') || '-' || lpad(
      (row_number() OVER (
        PARTITION BY date_part('year', "createdAt")
        ORDER BY "createdAt", "id"
      ))::text,
      5,
      '0'
    ) AS "gen"
  FROM "Contract"
)
UPDATE "Contract" c
SET "contractNo" = n."gen"
FROM numbered n
WHERE c."id" = n."id";

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNo_key" ON "Contract"("contractNo");
