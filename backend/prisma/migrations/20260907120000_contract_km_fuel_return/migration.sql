-- Vehicle-return flow: per-contract km allowance (daily/monthly) + overage and
-- missing-fuel unit prices, plus the odometer/fuel readings captured at return.
-- Additive-only: seven nullable columns on Contract. The legacy single-total
-- "kmLimit" column stays for historical rows.

ALTER TABLE "Contract" ADD COLUMN "returnKm" INTEGER;
ALTER TABLE "Contract" ADD COLUMN "returnFuelEighths" INTEGER;
ALTER TABLE "Contract" ADD COLUMN "returnedAt" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN "dailyKmLimit" INTEGER;
ALTER TABLE "Contract" ADD COLUMN "monthlyKmLimit" INTEGER;
ALTER TABLE "Contract" ADD COLUMN "kmOverageFee" DOUBLE PRECISION;
ALTER TABLE "Contract" ADD COLUMN "fuelFeePerEighth" DOUBLE PRECISION;
