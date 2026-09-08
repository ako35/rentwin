-- Rental type: daily vs monthly (30-day fixed month + prorated days).
-- Additive; existing contracts default to DAILY so pricing is unchanged.
ALTER TABLE "Contract" ADD COLUMN "rentalType" TEXT NOT NULL DEFAULT 'DAILY';
ALTER TABLE "Contract" ADD COLUMN "monthlyPrice" DOUBLE PRECISION;
