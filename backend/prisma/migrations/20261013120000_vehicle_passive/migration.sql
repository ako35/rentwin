-- Vehicle.passiveAt/passiveNote: a temporary, admin-reversible "pull this car
-- out of active rotation" state, distinct from outOfService (mechanical) and
-- soldAt (permanent). Additive.
ALTER TABLE "Vehicle" ADD COLUMN "passiveAt" TIMESTAMP(3);
ALTER TABLE "Vehicle" ADD COLUMN "passiveNote" TEXT;
