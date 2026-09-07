-- HGS/OGS toll-check tracking on a contract: status, the queried date range,
-- the toll amount and whether it was reflected to the customer. Additive —
-- five nullable columns (hgsReflected defaults to false).

ALTER TABLE "Contract" ADD COLUMN "hgsStatus" TEXT;
ALTER TABLE "Contract" ADD COLUMN "hgsCheckedFrom" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN "hgsCheckedTo" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN "hgsAmount" DOUBLE PRECISION;
ALTER TABLE "Contract" ADD COLUMN "hgsReflected" BOOLEAN NOT NULL DEFAULT false;
