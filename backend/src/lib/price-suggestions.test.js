const test = require("node:test");
const assert = require("node:assert/strict");
const { MONTHLY_REFERENCE, suggestPrice, yearFactor } = require("./price-suggestions");
const { modelKey } = require("./vehicle-models");

test("every reference entry is keyed by modelKey and has a group and a price", () => {
  for (const [key, entry] of Object.entries(MONTHLY_REFERENCE)) {
    assert.equal(modelKey(key, ""), key, `${key} is not a normalized key`);
    assert.ok(["car", "light", "heavy"].includes(entry.group), key);
    assert.ok(entry.Manual || entry.Automatic, key);
  }
});

test("Turkish spellings from the fleet resolve to the reference", () => {
  assert.deepEqual(suggestPrice({ brand: "FİAT", model: "FİORİNO", transmission: "Manual", modelYear: 2023 }), {
    monthly: 40000,
    daily: 1850,
  });
  assert.deepEqual(suggestPrice({ brand: "FORD", model: "TRANSİT ÇİFT KABİN", transmission: "Manual", modelYear: 2024 }), {
    monthly: 80000,
    daily: 4250,
  });
  assert.ok(suggestPrice({ brand: "İSUZU", model: "NPR3D", transmission: "Manual", modelYear: 2023 }));
});

test("automatic and newer units suggest more, old units less", () => {
  const manual = suggestPrice({ brand: "FIAT", model: "EGEA", transmission: "Manual", modelYear: 2023 });
  const automatic = suggestPrice({ brand: "FIAT", model: "EGEA", transmission: "Automatic", modelYear: 2023 });
  const newer = suggestPrice({ brand: "FIAT", model: "EGEA", transmission: "Manual", modelYear: 2026 });
  const old = suggestPrice({ brand: "CİTROEN", model: "C3", transmission: "Manual", modelYear: 2004 });
  assert.deepEqual(manual, { monthly: 42500, daily: 2000 });
  assert.ok(automatic.monthly > manual.monthly && automatic.daily > manual.daily);
  assert.ok(newer.monthly > manual.monthly);
  assert.deepEqual(old, { monthly: 26000, daily: 1200 });
});

test("a gearbox missing from the reference is derived from the other one", () => {
  // Doblo lists both; Fiorino lists only manual, so an automatic one is +5.000.
  assert.equal(suggestPrice({ brand: "FIAT", model: "FIORINO", transmission: "Automatic", modelYear: 2023 }).monthly, 45000);
  assert.equal(suggestPrice({ brand: "FIAT", model: "DOBLO", transmission: "SemiAutomatic", modelYear: 2023 }).monthly, 50000);
});

test("unknown models and missing years", () => {
  assert.equal(suggestPrice({ brand: "Tesla", model: "Model Y", transmission: "Automatic", modelYear: 2025 }), null);
  assert.equal(yearFactor(null), 1);
  assert.deepEqual(
    suggestPrice({ brand: "RENAULT", model: "CLİO", transmission: "Automatic", modelYear: null }),
    suggestPrice({ brand: "RENAULT", model: "CLİO", transmission: "Automatic", modelYear: 2022 })
  );
});

test("daily prices carry a short-rental premium over monthly / 30", () => {
  for (const key of Object.keys(MONTHLY_REFERENCE)) {
    const [brand, ...rest] = key.split(" ");
    const s = suggestPrice({ brand, model: rest.join(" "), transmission: "Manual", modelYear: 2023 });
    assert.ok(s.daily > s.monthly / 30, key);
    assert.equal(s.monthly % 500, 0, key);
    assert.equal(s.daily % 50, 0, key);
  }
});
