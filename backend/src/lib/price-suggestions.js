const { modelKey } = require("./vehicle-models");

// Suggested list prices for the admin Fiyat Listesi page. The admin still
// types and saves every price by hand; this column only says "a sensible
// price for this vehicle would be about X". It replaced the per-vehicle
// "Yapay Zeka ile Araştır" button (2026-11-26).
//
// MONTHLY_REFERENCE is the monthly price (TL, KDV hariç, like the list
// prices themselves) for a 2020–2024 unit of each model, researched in
// November 2026 from Turkish rental price lists and listings:
//   - short-term rentals with a 28+ day rate (e.g. Ayhancar İzmir: Egea
//     1.400 TL/day at 28+ days, automatic Egea 2.016, Doblo 1.568,
//     Trafic 8+1 3.920),
//   - long-term fleet price lists (e.g. Filoteknik, 12 months, 4.000 km/ay:
//     Egea 43.333, Clio 41.667, Taliant 48.333, Fiorino 33.333, Doblo
//     54.166, Combo / Courier 40.000, Transit Custom 50.000, Ducato van
//     70.833), Bufilo / Fleet Intelligence (automatic Egea 30–42k + KDV,
//     Doblo 31–35k + KDV),
//   - 8+1 minibus listings (Jumpy / Transit Custom 8+1: 78–180k a month,
//     5.000–7.500 TL a day).
// Rentwin rents month by month with no deposit, local delivery and
// 3.000 km/ay, so the reference sits a little above the long-term fleet
// rate and around the short-term 28+ day rate. Update it when the market
// moves; a model missing here gets no suggestion rather than a guess.
const MARKET_AS_OF = "2026-11";

const MONTHLY_REFERENCE = {
  // Binek
  "FIAT EGEA": { group: "car", Manual: 42500, Automatic: 47500 },
  "RENAULT CLIO": { group: "car", Manual: 42500, Automatic: 47500 },
  "RENAULT TALIANT": { group: "car", Manual: 42500, Automatic: 47500 },
  "DACIA SANDERO": { group: "car", Manual: 40000, Automatic: 45000 },
  "CITROEN C3": { group: "car", Manual: 40000, Automatic: 45000 },
  "FIAT PANDA": { group: "car", Manual: 40000, Automatic: 45000 },
  "SKODA OCTAVIA": { group: "car", Manual: 62500, Automatic: 67500 },
  // Hafif ticari
  "FIAT FIORINO": { group: "light", Manual: 40000 },
  "FORD COURIER": { group: "light", Manual: 42500 },
  "OPEL COMBO": { group: "light", Manual: 45000, Automatic: 50000 },
  "FIAT DOBLO": { group: "light", Manual: 45000, Automatic: 50000 },
  // Büyük ticari, kamyonet, minibüs
  "FORD TRANSIT CIFT KABIN": { group: "heavy", Manual: 80000 },
  "FIAT DUCATO": { group: "heavy", Manual: 80000 },
  "CITROEN JUMPY SPACETOURER": { group: "heavy", Manual: 100000, Automatic: 105000 },
  "ISUZU NPR3D": { group: "heavy", Manual: 110000 },
};

// Daily price = monthly / 30 x this premium. Short rentals cost more per day
// (Ayhancar: 3–6 day rate is ~1,5x its 28+ day rate); big commercial
// vehicles carry a larger premium because they are rented by the day for
// one-off jobs.
const DAILY_PREMIUM = { car: 1.4, light: 1.4, heavy: 1.6 };

// Newer units rent for a little more, old ones for clearly less.
const yearFactor = (modelYear) => {
  const year = Number(modelYear);
  if (!year) return 1;
  if (year >= 2025) return 1.05;
  if (year >= 2020) return 1;
  if (year >= 2015) return 0.9;
  if (year >= 2010) return 0.75;
  return 0.65;
};

const roundTo = (value, step) => Math.round(value / step) * step;

const monthlyFor = (entry, transmission) => {
  const gearbox = transmission === "SemiAutomatic" ? "Automatic" : transmission;
  if (entry[gearbox]) return entry[gearbox];
  // Only the other gearbox is listed: automatic rents ~5.000 TL a month above manual.
  if (gearbox === "Automatic" && entry.Manual) return entry.Manual + 5000;
  if (gearbox === "Manual" && entry.Automatic) return entry.Automatic - 5000;
  return entry.Manual || entry.Automatic || null;
};

// { daily, monthly } in TL (KDV hariç), or null when the model has no reference.
const suggestPrice = ({ brand, model, transmission, modelYear }) => {
  const entry = MONTHLY_REFERENCE[modelKey(brand, model)];
  if (!entry) return null;
  const base = monthlyFor(entry, transmission);
  if (!base) return null;
  const monthly = base * yearFactor(modelYear);
  return {
    monthly: roundTo(monthly, 500),
    daily: roundTo((monthly / 30) * DAILY_PREMIUM[entry.group], 50),
  };
};

module.exports = { MARKET_AS_OF, MONTHLY_REFERENCE, suggestPrice, yearFactor };
