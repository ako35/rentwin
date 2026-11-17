-- KABİS follow-up for mid-contract vehicle swaps: the previous car's record
-- released and the new car filed. Additive only.
ALTER TABLE "ContractVehicleChange" ADD COLUMN "kbsOldReleasedAt" TIMESTAMP(3);
ALTER TABLE "ContractVehicleChange" ADD COLUMN "kbsOldReleasedBy" TEXT;
ALTER TABLE "ContractVehicleChange" ADD COLUMN "kbsNewNotifiedAt" TIMESTAMP(3);
ALTER TABLE "ContractVehicleChange" ADD COLUMN "kbsNewNotifiedBy" TEXT;

-- Swaps on contracts whose KABİS record is already released (the whole
-- rental is closed out in KABİS) count as done, stamped at the swap time —
-- otherwise they would all show up as pending on the dashboard.
UPDATE "ContractVehicleChange" AS v
SET "kbsOldReleasedAt" = v."changeDate",
    "kbsNewNotifiedAt" = v."changeDate"
FROM "Contract" AS c
WHERE c."id" = v."contractId"
  AND c."kbsReleasedAt" IS NOT NULL;
