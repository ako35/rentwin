-- App-wide settings singleton (id is always 'singleton'). Currently holds the
-- default km limits / overage / fuel fee pre-filled into new contracts.
-- Additive: a brand-new table.

CREATE TABLE "Setting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "defaultDailyKmLimit" INTEGER,
    "defaultMonthlyKmLimit" INTEGER,
    "defaultKmOverageFee" DOUBLE PRECISION,
    "defaultFuelFeePerEighth" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
