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
