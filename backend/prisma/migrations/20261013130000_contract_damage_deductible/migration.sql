-- Kasko muafiyeti (CDW deductible) per contract, printed on Madde 4 and EK-1.
-- Additive, nullable; blank keeps the previous hardcoded 15.000 TL default.
ALTER TABLE "Contract" ADD COLUMN "damageDeductible" DOUBLE PRECISION;
