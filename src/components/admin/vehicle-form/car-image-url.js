// imagin.studio car render URL builder. imagin serves studio PNG/WebP shots of
// almost every make/model straight from a CDN, addressed entirely by query
// params — no API call, no key secret (the `customer` id is a public embed
// identifier, exactly like the ones in imagin's own `<img>` examples). Set
// VITE_IMAGIN_CUSTOMER to your own id in production; "img" is imagin's sandbox.
const CUSTOMER = import.meta.env.VITE_IMAGIN_CUSTOMER || "img";

// imagin's paintDescription vocabulary is English — translate the Turkish
// colour names the form uses. Unmapped values pass through lower-cased and
// imagin falls back to a default finish.
const PAINT_TR_EN = {
  beyaz: "white",
  siyah: "black",
  gri: "grey",
  füme: "grey",
  fume: "grey",
  antrasit: "grey",
  gümüş: "silver",
  gumus: "silver",
  kırmızı: "red",
  kirmizi: "red",
  bordo: "maroon",
  mavi: "blue",
  lacivert: "blue",
  yeşil: "green",
  yesil: "green",
  sarı: "yellow",
  sari: "yellow",
  turuncu: "orange",
  kahverengi: "brown",
  kahve: "brown",
  bej: "beige",
  altın: "gold",
  altin: "gold",
  mor: "purple",
};

const toPaintDescription = (color) => {
  const key = (color || "").trim().toLowerCase();
  if (!key) return null;
  return PAINT_TR_EN[key] || key;
};

// Returns "" when brand or model is missing so callers can treat it as "no
// preview yet".
export const buildCarImageUrl = ({ brand, model, modelYear, color, angle = "23" } = {}) => {
  const make = (brand || "").trim();
  const family = (model || "").trim();
  if (!make || !family) return "";

  const params = new URLSearchParams({
    customer: CUSTOMER,
    make: make.toLowerCase(),
    modelFamily: family.toLowerCase(),
    angle: String(angle),
    fileType: "png",
  });

  const year = String(modelYear || "").trim();
  if (year) params.set("modelYear", year);

  const paint = toPaintDescription(color);
  if (paint) params.set("paintDescription", paint);

  return `https://cdn.imagin.studio/getimage?${params.toString()}`;
};
