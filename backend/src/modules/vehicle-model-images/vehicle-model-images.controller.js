const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { uploadImage, deleteImage } = require("../../lib/blob");
const { generateVehicleImage } = require("../../lib/gemini");
const { modelImageKey } = require("../../lib/serializers");

// brand/model are stored normalized so the [brand, model] unique key is exact.
const normPart = (value) => (value || "").trim().toLocaleUpperCase("tr");

const toClientRow = (image) =>
  image && {
    id: image.id,
    blobUrl: image.blobUrl,
    source: image.source,
    updatedAt: image.updatedAt,
  };

// One row per make+model actually present in the fleet, joined with its model
// image (null when none). Orphan images (model no longer in the fleet) are
// appended so the admin can still remove them.
const listModelImages = asyncHandler(async (req, res) => {
  const [vehicles, images] = await Promise.all([
    prisma.vehicle.findMany({ select: { brand: true, model: true } }),
    prisma.vehicleModelImage.findMany(),
  ]);

  const imageByKey = new Map(images.map((i) => [modelImageKey(i.brand, i.model), i]));
  const groups = new Map();
  for (const v of vehicles) {
    const key = modelImageKey(v.brand, v.model);
    if (!groups.has(key)) {
      groups.set(key, { brand: (v.brand || "").trim(), model: (v.model || "").trim(), vehicleCount: 0 });
    }
    groups.get(key).vehicleCount += 1;
  }

  const rows = [...groups.entries()].map(([key, group]) => ({
    ...group,
    image: toClientRow(imageByKey.get(key)) || null,
  }));

  for (const [key, image] of imageByKey) {
    if (!groups.has(key)) {
      rows.push({ brand: image.brand, model: image.model, vehicleCount: 0, image: toClientRow(image) });
    }
  }

  rows.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, "tr"));
  res.json(rows);
});

// Replace the blob a model image points at (deleting the previous one) and
// upsert the row. Shared by the upload and AI-generate paths.
const saveModelImage = async ({ brand, model, buffer, mimetype, originalname, source }) => {
  const key = { brand: normPart(brand), model: normPart(model) };
  if (!key.brand || !key.model) throw new HttpError(400, "Marka ve model gerekli.");

  const existing = await prisma.vehicleModelImage.findUnique({
    where: { brand_model: key },
  });

  const { blobUrl, pathname } = await uploadImage({ buffer, mimetype, originalname }, "model-images");

  const saved = await prisma.vehicleModelImage.upsert({
    where: { brand_model: key },
    update: { blobUrl, pathname, source },
    create: { ...key, blobUrl, pathname, source },
  });

  if (existing && existing.pathname !== pathname) {
    await deleteImage(existing.pathname).catch(() => {});
  }
  return saved;
};

const uploadModelImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Görsel yüklenmedi.");
  const saved = await saveModelImage({
    brand: req.body.brand,
    model: req.body.model,
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    originalname: req.file.originalname || "model.png",
    source: "UPLOAD",
  });
  res.status(201).json(toClientRow(saved));
});

const generateModelImage = asyncHandler(async (req, res) => {
  const { brand, model, color } = req.body || {};
  if (!brand || !model) throw new HttpError(400, "Marka ve model gerekli.");

  let image;
  try {
    image = await generateVehicleImage({ brand, model, color });
  } catch (error) {
    if (error.code === "AI_IMAGE_QUOTA") throw new HttpError(429, error.message, "AI_IMAGE_QUOTA");
    throw new HttpError(502, error.message);
  }

  const ext = (image.mimeType.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "");
  const saved = await saveModelImage({
    brand,
    model,
    buffer: Buffer.from(image.base64, "base64"),
    mimetype: image.mimeType,
    originalname: `${normPart(brand)}-${normPart(model)}.${ext}`.toLowerCase(),
    source: "AI",
  });
  res.status(201).json(toClientRow(saved));
});

const deleteModelImage = asyncHandler(async (req, res) => {
  const image = await prisma.vehicleModelImage.findUnique({ where: { id: req.params.id } });
  if (!image) throw new HttpError(404, "Model görseli bulunamadı.");

  await deleteImage(image.pathname).catch(() => {});
  await prisma.vehicleModelImage.delete({ where: { id: image.id } });
  res.json({ message: "Model görseli silindi." });
});

module.exports = { listModelImages, uploadModelImage, generateModelImage, deleteModelImage };
