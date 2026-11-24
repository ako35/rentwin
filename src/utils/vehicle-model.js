// Client mirror of backend/src/lib/vehicle-models.js `modelKey` — "FİAT
// FİORİNO", "Fiat Fiorino" and "FIAT  FIORINO" are the same model.
export const modelKey = (brand, model) =>
  `${brand || ""} ${model || ""}`
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

// One entry per model: its canonical unit — the earliest-listed one, ties by
// id, i.e. the unit every sibling page canonicalizes to — plus `bodyTypes`,
// every body type its units carry (units of one model are not always
// classified alike). Mirrors backend/src/lib/vehicle-models.js groupFleetByModel.
export const groupFleetByModel = (units) => {
  const groups = new Map();
  for (const unit of units) {
    const key = modelKey(unit.brand, unit.model);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(unit);
  }
  const time = (d) => (d ? new Date(d).getTime() : 0);
  return [...groups.values()].map((group) => {
    const [canonical] = [...group].sort(
      (a, b) => time(a.createdAt) - time(b.createdAt) || (a.id < b.id ? -1 : 1)
    );
    return { ...canonical, bodyTypes: [...new Set(group.map((unit) => unit.bodyType))] };
  });
};

// "Rentwin filosunda 5 adet FIAT EGEA bulunuyor: 2023–2026 model, Manuel ve
// Otomatik vites …" — mirrors backend seo-ld.js formatVariants (the bot
// prerender renders the same sentence). Empty for a single-unit model.
// variants: the API's modelInfo.variants; t: the "vehicles" namespace,
// tCommon: "common" (option labels); lang: "tr" | "en".
export const formatVariants = (variants, name, { t, tCommon, lang }) => {
  if (!variants || variants.count < 2) return "";
  const list = new Intl.ListFormat(lang === "en" ? "en" : "tr", { type: "conjunction" });
  const transmissions = list.format(
    variants.transmissions.map((value) => tCommon(`options.transmissionTypes.${value}`))
  );
  const fuels = list.format(variants.fuelTypes.map((value) => tCommon(`options.fuelTypes.${value}`)));
  const years =
    variants.minYear == null
      ? ""
      : variants.minYear === variants.maxYear
        ? String(variants.minYear)
        : `${variants.minYear}–${variants.maxYear}`;
  return t(years ? "details.variantsWithYears" : "details.variants", {
    count: variants.count,
    name,
    years,
    transmissions,
    fuels,
  });
};

// The /arac-kiralama-fiyatlari price table: one row per model with the lowest
// and highest daily / monthly list price across its units (units of one model
// differ by year and transmission), its transmissions and fuels, and its
// canonical unit's id for the link; unpriced models sort last.
// Mirrors backend/src/lib/vehicle-models.js summarizeFleetPrices.
const priceRange = (values) => {
  const prices = values.map(Number).filter((p) => p > 0);
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
};
const uniqueSorted = (values) => [...new Set(values.filter((v) => v != null && v !== ""))].sort();

export const summarizeFleetPrices = (units) => {
  const groups = new Map();
  for (const unit of units) {
    const key = modelKey(unit.brand, unit.model);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(unit);
  }
  const time = (d) => (d ? new Date(d).getTime() : 0);
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  return [...groups.values()]
    .map((group) => {
      const [head] = [...group].sort(
        (a, b) => time(a.createdAt) - time(b.createdAt) || (a.id < b.id ? -1 : 1)
      );
      return {
        id: head.id,
        name: `${clean(head.brand)} ${clean(head.model)}`.trim(),
        count: group.length,
        transmissions: uniqueSorted(group.map((u) => u.transmission)),
        fuelTypes: uniqueSorted(group.map((u) => u.fuelType)),
        daily: priceRange(group.map((u) => u.dailyPrice)),
        monthly: priceRange(group.map((u) => u.monthlyPrice)),
      };
    })
    .sort(
      (a, b) =>
        (a.daily?.min ?? Infinity) - (b.daily?.min ?? Infinity) ||
        (a.monthly?.min ?? Infinity) - (b.monthly?.min ?? Infinity) ||
        a.name.localeCompare(b.name, "tr")
    );
};

// Brand/model as people search for it: fleet records are typed in capitals
// with mixed dotted/undotted I ("FIAT", "FİAT", "CİTROEN"). Tokens with a digit
// stay as typed (C3, NPR3D); Turkish casing only where the token already has a
// Turkish letter, so "FIAT" doesn't become "Fıat". Mirror of
// backend/src/lib/vehicle-models.js — KEEP IN SYNC.
const BRAND_NAMES = { FIAT: "Fiat", CITROEN: "Citroën", ISUZU: "Isuzu", SKODA: "Skoda", RENAULT: "Renault", FORD: "Ford", OPEL: "Opel", PEUGEOT: "Peugeot", TOYOTA: "Toyota", HYUNDAI: "Hyundai", VOLKSWAGEN: "Volkswagen", DACIA: "Dacia", MERCEDES: "Mercedes" };
const TOKEN_NAMES = { SPACETOURER: "SpaceTourer" };
const asciiUpper = (s) => s.replace(/İ/g, "I").replace(/Ş/g, "S").replace(/Ğ/g, "G").replace(/Ç/g, "C").replace(/Ö/g, "O").replace(/Ü/g, "U").toUpperCase();
const prettyToken = (token, index) => {
  const key = asciiUpper(token);
  if (index === 0 && BRAND_NAMES[key]) return BRAND_NAMES[key];
  if (TOKEN_NAMES[key]) return TOKEN_NAMES[key];
  if (/\d/.test(token)) return token.toUpperCase();
  const lower = /[İŞĞÇÖÜışğçöü]/.test(token) ? token.toLocaleLowerCase("tr") : token.toLowerCase();
  return lower.charAt(0).toLocaleUpperCase("tr") + lower.slice(1);
};
export const prettyModelName = (brand, model) =>
  `${brand || ""} ${model || ""}`.trim().split(/\s+/).filter(Boolean).map(prettyToken).join(" ");

const SPEC_WORDS = {
  tr: {
    transmission: { Manual: "manuel", Automatic: "otomatik", SemiAutomatic: "yarı otomatik" },
    fuel: { Diesel: "dizel", Gasoline: "benzin", LPG: "LPG", Hybrid: "hibrit", Electricity: "elektrikli", CNG: "CNG" },
    and: " ve ",
  },
  en: {
    transmission: { Manual: "manual", Automatic: "automatic", SemiAutomatic: "semi-automatic" },
    fuel: { Diesel: "diesel", Gasoline: "petrol", LPG: "LPG", Hybrid: "hybrid", Electricity: "electric", CNG: "CNG" },
    and: " and ",
  },
};
const tl = (n) => Number(n).toLocaleString("tr-TR");

// Title + meta description of a vehicle (model) page, from the model's fleet
// summary: model name, location, the lowest daily/monthly list price and the
// transmission/fuel options. Mirror of backend/src/lib/vehicle-models.js.
export const vehicleSeoText = ({ brand, model, variants = {}, dailyPrice, monthlyPrice }, locale = "tr") => {
  const w = SPEC_WORDS[locale] || SPEC_WORDS.tr;
  const name = prettyModelName(brand, model);
  const daily = variants.minDaily || (Number(dailyPrice) > 0 ? Number(dailyPrice) : null);
  const monthly = variants.minMonthly || (Number(monthlyPrice) > 0 ? Number(monthlyPrice) : null);
  const list = (values, dict) => values.map((v) => dict[v] || v).filter(Boolean).join(w.and);
  const trans = list(variants.transmissions || [], w.transmission);
  const fuel = list(variants.fuelTypes || [], w.fuel);
  if (locale === "en") {
    const spec = [trans && `${trans} transmission`, fuel].filter(Boolean).join(", ");
    const prices = [daily && `from ${tl(daily)} TL/day`, monthly && `${tl(monthly)} TL/month`].filter(Boolean).join(", ");
    return {
      title: daily ? `${name} Rental in Aliağa | ${tl(daily)} TL+VAT/day – Rentwin` : `${name} Rental in Aliağa | Rentwin`,
      description: `Rent a ${name} in Aliağa${spec ? `: ${spec}` : ""}.${prices ? ` ${prices.charAt(0).toUpperCase()}${prices.slice(1)} (excl. VAT).` : ""} No deposit, airport delivery, online booking.`,
    };
  }
  const spec = [trans && `${trans} vites`, fuel].filter(Boolean).join(", ");
  const prices = [daily && `günlük ${tl(daily)} TL'den`, monthly && `aylık ${tl(monthly)} TL'den`].filter(Boolean).join(", ");
  return {
    title: daily ? `${name} Kiralama Aliağa | ${tl(daily)} TL+KDV/gün – Rentwin` : `${name} Kiralama Aliağa | Rentwin`,
    description: `${name} kiralama Aliağa'da${spec ? `: ${spec}` : ""}.${prices ? ` ${prices.charAt(0).toLocaleUpperCase("tr")}${prices.slice(1)} (KDV hariç).` : ""} Depozito yok, havalimanı teslimi, online rezervasyon.`,
  };
};
