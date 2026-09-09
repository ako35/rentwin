-- One catalog image per vehicle make+model. Additive — a brand-new table.
-- brand/model are stored normalized (trim + TR-uppercase) by the API; the
-- unique index enforces one row per make+model. Existing per-vehicle
-- VehicleImage rows stay as a legacy fallback until a model image is set.

CREATE TABLE "VehicleModelImage" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'UPLOAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModelImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleModelImage_brand_model_key" ON "VehicleModelImage"("brand", "model");
