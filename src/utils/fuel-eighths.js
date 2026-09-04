// Fuel / charge gauge as a select in eighths: "—" (not set) + 0/8 … 8/8, with
// Boş / ¼ / ½ / ¾ / Dolu hints on the marked positions. Shared by the vehicle
// form and the contract's hand-over section.
// `t` is the "admin" namespace translator (labels live under vehicles.form.*).
const FUEL_EIGHTHS_HINT = { 0: "fuelEmpty", 2: "fuelQuarter", 4: "fuelHalf", 6: "fuelThreeQuarter", 8: "fuelFull" };

export const buildFuelEighthsOptions = (t) => [
  { id: "fe-none", value: "", name: t("vehicles.form.fuelNotSet") },
  ...Array.from({ length: 9 }, (_, n) => ({
    id: `fe-${n}`,
    value: String(n),
    name: FUEL_EIGHTHS_HINT[n] ? `${n}/8 · ${t(`vehicles.form.${FUEL_EIGHTHS_HINT[n]}`)}` : `${n}/8`,
  })),
];
