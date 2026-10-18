-- Vehicle.dailyPrice/monthlyPrice: per-vehicle list prices edited from the
-- admin Fiyat Listesi page. Additive.
ALTER TABLE "Vehicle" ADD COLUMN "dailyPrice" DOUBLE PRECISION;
ALTER TABLE "Vehicle" ADD COLUMN "monthlyPrice" DOUBLE PRECISION;
