-- Model images can now be per-colour, not just per-brand+model. color=""
-- (the default for every existing row) is the generic/no-colour-specific
-- fallback image, so existing data keeps working unchanged. Additive column
-- + a swap of the unique index to include it.

ALTER TABLE "VehicleModelImage" ADD COLUMN "color" TEXT NOT NULL DEFAULT '';

DROP INDEX "VehicleModelImage_brand_model_key";

CREATE UNIQUE INDEX "VehicleModelImage_brand_model_color_key" ON "VehicleModelImage"("brand", "model", "color");
