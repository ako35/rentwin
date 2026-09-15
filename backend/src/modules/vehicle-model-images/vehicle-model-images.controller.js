const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { uploadImage, deleteImage } = require("../../lib/blob");
const { generateVehicleImage } = require("../../lib/gemini");
const { modelImageKey } = require("../../lib/serializers");

// brand/model/color are stored normalized so the [brand, model, color]
// unique key is exact. color="" is the generic/no-colour-specific slot.
const normPart = (value) => (value || "").trim().toLocaleUpperCase("tr");
// Groups by brand+model only (no colour) — distinct from modelImageKey,
// which always resolves a specific colour slot (defaulting to the generic
// one) and so can't double as a "just this model, any colour" grouping key.
const groupKey = (brand, model) => `${normPart(brand)} ${normPart(model)}`;

const toClientRow = (image) =>
  image && {
    id: image.id,
    blobUrl: image.blobUrl,
    source: image.source,
    updatedAt: image.updatedAt,
  };

// One row per make+model actually present in the fleet, each carrying its
// generic (no-colour) image plus one entry per colour actually driven in
// that fleet — every vehicle of that colour shows this slot's image instead
// of the generic one (see serializeVehicle). Colour slots with an uploaded
// image but no live vehicle of that exact colour any more, and whole
// make+models no longer in the fleet, are still surfaced (vehicleCount: 0)
// so the admin can remove them.
const listModelImages = asyncHandler(async (req, res) => {
  const [vehicles, images] = await Promise.all([
    prisma.vehicle.findMany({ select: { brand: true, model: true, color: true } }),
    prisma.vehicleModelImage.findMany(),
  ]);

  const imageByKey = new Map(images.map((i) => [modelImageKey(i.brand, i.model, i.color), i]));

  const groups = new Map();
  const getGroup = (brand, model) => {
    const key = groupKey(brand, model);
    if (!groups.has(key)) {
      groups.set(key, {
        brand: (brand || "").trim(),
        model: (model || "").trim(),
        vehicleCount: 0,
        colors: new Map(), // normalized colour -> { color: display text, vehicleCount }
      });
    }
    return groups.get(key);
  };

  for (const v of vehicles) {
    const group = getGroup(v.brand, v.model);
    group.vehicleCount += 1;
    const rawColor = (v.color || "").trim();
    if (!rawColor) continue;
    const cKey = normPart(rawColor);
    if (!group.colors.has(cKey)) group.colors.set(cKey, { color: rawColor, vehicleCount: 0 });
    group.colors.get(cKey).vehicleCount += 1;
  }

  // A colour image whose model still has other live vehicles, but none left
  // of that exact colour, needs a slot of its own too (vehicleCount 0).
  for (const image of images) {
    if (!image.color) continue; // generic slot — read directly below, not part of `colors`
    const group = groups.get(groupKey(image.brand, image.model));
    if (!group) continue; // whole model is gone — the orphan pass below covers it
    const cKey = normPart(image.color);
    if (!group.colors.has(cKey)) group.colors.set(cKey, { color: image.color, vehicleCount: 0 });
  }

  const rows = [...groups.values()].map((group) => ({
    brand: group.brand,
    model: group.model,
    vehicleCount: group.vehicleCount,
    genericImage: toClientRow(imageByKey.get(modelImageKey(group.brand, group.model))) || null,
    colors: [...group.colors.values()]
      .map((c) => ({
        ...c,
        image: toClientRow(imageByKey.get(modelImageKey(group.brand, group.model, c.color))) || null,
      }))
      .sort((a, b) => a.color.localeCompare(b.color, "tr")),
  }));

  const orphanModelKeys = new Set(
    images.map((i) => groupKey(i.brand, i.model)).filter((key) => !groups.has(key))
  );
  for (const key of orphanModelKeys) {
    const own = images.filter((i) => groupKey(i.brand, i.model) === key);
    const { brand, model } = own[0];
    rows.push({
      brand,
      model,
      vehicleCount: 0,
      genericImage: toClientRow(own.find((i) => !i.color)) || null,
      colors: own.filter((i) => i.color).map((i) => ({ color: i.color, vehicleCount: 0, image: toClientRow(i) })),
    });
  }

  rows.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, "tr"));
  res.json(rows);
});

// Replace the blob a model image slot points at (deleting the previous one)
// and upsert the row. Shared by the upload and AI-generate paths.
const saveModelImage = async ({ brand, model, color, buffer, mimetype, originalname, source }) => {
  const key = { brand: normPart(brand), model: normPart(model), color: normPart(color) };
  if (!key.brand || !key.model) throw new HttpError(400, "Marka ve model gerekli.");

  const existing = await prisma.vehicleModelImage.findUnique({
    where: { brand_model_color: key },
  });

  const { blobUrl, pathname } = await uploadImage({ buffer, mimetype, originalname }, "model-images");

  const saved = await prisma.vehicleModelImage.upsert({
    where: { brand_model_color: key },
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
    color: req.body.color,
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
    color,
    buffer: Buffer.from(image.base64, "base64"),
    mimetype: image.mimeType,
    originalname: `${normPart(brand)}-${normPart(model)}-${normPart(color) || "generic"}.${ext}`.toLowerCase(),
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
