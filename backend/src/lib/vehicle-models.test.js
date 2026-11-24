const test = require("node:test");
const assert = require("node:assert/strict");
const {
  modelKey,
  MODEL_COPY,
  getModelCopy,
  summarizeVariants,
  buildCanonicalVehicleMap,
  pickRelatedModels,
  groupFleetByModel,
  summarizeFleetPrices,
  prettyModelName,
  vehicleSeoText,
} = require("./vehicle-models");

const unit = (id, brand, model, extra = {}) => ({
  id,
  brand,
  model,
  createdAt: new Date(extra.createdAt || "2026-09-01"),
  bodyType: extra.bodyType || "BINEK",
  modelYear: extra.modelYear ?? null,
  transmission: extra.transmission || "Manual",
  fuelType: extra.fuelType || "Diesel",
});

test("modelKey treats Turkish spellings and spacing of one model as the same key", () => {
  assert.equal(modelKey("FİAT", "FİORİNO"), "FIAT FIORINO");
  assert.equal(modelKey("Fiat", "  Fiorino "), "FIAT FIORINO");
  assert.equal(modelKey("FORD", "TRANSİT ÇİFT KABİN"), "FORD TRANSIT CIFT KABIN");
  assert.equal(modelKey("Skoda", "Octavıa"), "SKODA OCTAVIA");
});

test("every MODEL_COPY entry is keyed by modelKey and has both languages", () => {
  for (const [key, entry] of Object.entries(MODEL_COPY)) {
    assert.equal(modelKey(key, ""), key, `${key} is not a normalized key`);
    for (const lang of ["tr", "en"]) {
      assert.ok(entry[lang]?.summary?.length > 40, `${key}.${lang}.summary`);
      assert.equal(entry[lang].idealFor.length, 3, `${key}.${lang}.idealFor`);
    }
  }
  assert.ok(getModelCopy("FİAT", "EGEA"));
  assert.equal(getModelCopy("Tesla", "Model Y"), null);
});

test("all units of a model share one canonical: the earliest-listed one", () => {
  const map = buildCanonicalVehicleMap([
    unit("t2", "FORD", "TRANSİT ÇİFT KABİN", { createdAt: "2026-09-19", modelYear: 2025 }),
    unit("t1", "FORD", "TRANSİT ÇİFT KABİN", { createdAt: "2026-09-14", modelYear: 2023 }),
    unit("t3", "Ford", "Transit Çift Kabin", { createdAt: "2026-11-06", transmission: "Automatic" }),
    unit("e1", "FIAT", "EGEA", { createdAt: "2026-10-01" }),
  ]);
  assert.equal(map.get("t1"), null);
  assert.equal(map.get("t2"), "t1");
  assert.equal(map.get("t3"), "t1");
  assert.equal(map.get("e1"), null);
});

test("related models skip the current model and non-canonical units, same body type first", () => {
  const active = [
    unit("t1", "FORD", "TRANSİT ÇİFT KABİN", { bodyType: "KAMYONET", createdAt: "2026-09-14" }),
    unit("t2", "FORD", "TRANSİT ÇİFT KABİN", { bodyType: "KAMYONET", createdAt: "2026-09-19" }),
    unit("e1", "FIAT", "EGEA", { createdAt: "2026-09-01" }),
    unit("e2", "FIAT", "EGEA", { createdAt: "2026-10-01" }),
    unit("c1", "RENAULT", "CLİO"),
    unit("i1", "İSUZU", "NPR3D", { bodyType: "KAMYONET" }),
  ];
  const related = pickRelatedModels(active, active[1]);
  assert.deepEqual(
    related.map((r) => r.id),
    ["i1", "e1", "c1"]
  );
  assert.equal(related[0].name, "İSUZU NPR3D");
});

test("summarizeVariants reports count, year range and distinct options", () => {
  assert.deepEqual(
    summarizeVariants([
      unit("a", "FIAT", "EGEA", { modelYear: 2026 }),
      unit("b", "FIAT", "EGEA", { modelYear: 2023, transmission: "Automatic" }),
      unit("c", "FIAT", "EGEA", { modelYear: null }),
    ]),
    { count: 3, minYear: 2023, maxYear: 2026, transmissions: ["Automatic", "Manual"], fuelTypes: ["Diesel"], minDaily: null, minMonthly: null }
  );
});

test("summarizeVariants quotes the lowest positive daily and monthly price", () => {
  const v = summarizeVariants([
    { ...unit("a", "FIAT", "EGEA"), dailyPrice: 3000, monthlyPrice: 60000 },
    { ...unit("b", "FIAT", "EGEA"), dailyPrice: 2500, monthlyPrice: 0 },
    { ...unit("c", "FIAT", "EGEA"), dailyPrice: null, monthlyPrice: 45000 },
  ]);
  assert.equal(v.minDaily, 2500);
  assert.equal(v.minMonthly, 45000);
});

test("prettyModelName fixes capitals and dotted/undotted I", () => {
  assert.equal(prettyModelName("FIAT", "EGEA"), "Fiat Egea");
  assert.equal(prettyModelName("FİAT", "FİORİNO"), "Fiat Fiorino");
  assert.equal(prettyModelName("CİTROEN", "C3"), "Citroën C3");
  assert.equal(prettyModelName("CİTROEN", "JUMPY SPACETOURER"), "Citroën Jumpy SpaceTourer");
  assert.equal(prettyModelName("İSUZU", "NPR3D"), "Isuzu NPR3D");
  assert.equal(prettyModelName("FORD", "TRANSİT ÇİFT KABİN"), "Ford Transit Çift Kabin");
});

test("vehicleSeoText puts model, Aliağa and the from-price in the title", () => {
  const v = { brand: "FIAT", model: "EGEA", variants: { transmissions: ["Automatic", "Manual"], fuelTypes: ["Diesel"], minDaily: 2500, minMonthly: 45000 } };
  const tr = vehicleSeoText(v, "tr");
  assert.equal(tr.title, "Fiat Egea Kiralama Aliağa | 2.500 TL+KDV/gün – Rentwin");
  assert.match(tr.description, /otomatik ve manuel vites, dizel/);
  assert.ok(tr.description.includes("Günlük 2.500 TL'den, aylık 45.000 TL'den (KDV hariç)."), tr.description);
  assert.equal(vehicleSeoText(v, "en").title, "Fiat Egea Rental in Aliağa | 2.500 TL+VAT/day – Rentwin");
});

test("vehicleSeoText without prices leaves the price out", () => {
  const tr = vehicleSeoText({ brand: "FORD", model: "COURİER", variants: { transmissions: ["Manual"], fuelTypes: ["Diesel"] } }, "tr");
  assert.equal(tr.title, "Ford Courier Kiralama Aliağa | Rentwin");
  assert.doesNotMatch(tr.description, /TL/);
});

test("groupFleetByModel: one canonical unit per model, body types pooled across units", () => {
  const groups = groupFleetByModel([
    unit("t1", "FORD", "TRANSİT ÇİFT KABİN", { bodyType: "KAMYONET", createdAt: "2026-09-14" }),
    unit("t2", "FORD", "TRANSİT ÇİFT KABİN ", { bodyType: "BINEK", createdAt: "2026-09-10" }),
    unit("e1", "FIAT", "EGEA", { createdAt: "2026-09-01" }),
  ]);
  assert.equal(groups.length, 2);
  const transit = groups.find((g) => g.model.trim() === "TRANSİT ÇİFT KABİN");
  assert.equal(transit.id, "t2"); // the earliest-listed unit is the canonical one
  assert.deepEqual([...transit.bodyTypes].sort(), ["BINEK", "KAMYONET"]);
  assert.deepEqual(groups.find((g) => g.id === "e1").bodyTypes, ["BINEK"]);
});

test("summarizeFleetPrices: one row per model with price ranges, cheapest first, unpriced last", () => {
  const priced = (id, brand, model, daily, monthly, extra = {}) => ({ ...unit(id, brand, model, extra), dailyPrice: daily, monthlyPrice: monthly });
  const rows = summarizeFleetPrices([
    priced("e2", "FIAT", "EGEA", 3000, 60000, { createdAt: "2026-10-01", transmission: "Automatic" }),
    priced("e1", "FİAT", "EGEA ", 2500, 45000, { createdAt: "2026-09-01" }),
    priced("o1", "OPEL", "COMBO", null, null),
    priced("t1", "FORD", "TRANSİT ÇİFT KABİN", 9000, 85000, { bodyType: "KAMYONET" }),
  ]);
  assert.deepEqual(
    rows.map((r) => r.id),
    ["e1", "t1", "o1"]
  );
  const egea = rows[0];
  assert.equal(egea.name, "FİAT EGEA");
  assert.equal(egea.count, 2);
  assert.deepEqual(egea.daily, { min: 2500, max: 3000 });
  assert.deepEqual(egea.monthly, { min: 45000, max: 60000 });
  assert.deepEqual(egea.transmissions, ["Automatic", "Manual"]);
  assert.equal(rows[2].daily, null);
});
