const test = require("node:test");
const assert = require("node:assert/strict");
const {
  modelKey,
  MODEL_COPY,
  getModelCopy,
  summarizeVariants,
  buildCanonicalVehicleMap,
  pickRelatedModels,
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
    { count: 3, minYear: 2023, maxYear: 2026, transmissions: ["Automatic", "Manual"], fuelTypes: ["Diesel"] }
  );
});
