import { constants } from "../../../constants";

// Fuel / charge gauge in eighths: "—" (not set) + 0/8 … 8/8, with Boş / ¼ / ½ / ¾ / Dolu hints.
const FUEL_EIGHTHS_HINT = { 0: "fuelEmpty", 2: "fuelQuarter", 4: "fuelHalf", 6: "fuelThreeQuarter", 8: "fuelFull" };

// Field layout for the vehicle "Araç" tab, grouped into Kimlik / Ruhsat
// sections. brand/model are editable comboboxes fed by the current fleet.
export const buildVehicleSections = ({ branches, brandOptions, modelOptions, t, tCommon }) => {
  const withNames = (arr, resolve) => arr.map((item) => ({ ...item, name: resolve(item) }));

  const fuelEighthsOptions = [
    { id: "fe-none", value: "", name: t("vehicles.form.fuelNotSet") },
    ...Array.from({ length: 9 }, (_, n) => ({
      id: `fe-${n}`,
      value: String(n),
      name: FUEL_EIGHTHS_HINT[n] ? `${n}/8 · ${t(`vehicles.form.${FUEL_EIGHTHS_HINT[n]}`)}` : `${n}/8`,
    })),
  ];

  return [
    {
      key: "identity",
      items: [
        { name: "brand", editableSelect: true, options: brandOptions },
        { name: "model", editableSelect: true, options: modelOptions, autofillBrand: true },
        { name: "licensePlate" },
        { name: "modelYear", type: "number" },
        { name: "chassisNo" },
        { name: "engineNo" },
        { name: "color" },
        { name: "currentKm", type: "number" },
        { name: "currentFuelEighths", type: "select", itemsArr: fuelEighthsOptions },
        {
          name: "transmission",
          type: "select",
          itemsArr: withNames(constants.transmissionTypes, (i) =>
            tCommon(`options.transmissionTypes.${i.value}`)
          ),
        },
        {
          name: "fuelType",
          type: "select",
          itemsArr: withNames(constants.fuelTypes, (i) => tCommon(`options.fuelTypes.${i.value}`)),
        },
      ],
    },
    {
      key: "registration",
      items: [
        { name: "registrationSerialNo" },
        { name: "registrationDate", type: "date" },
        {
          name: "branchId",
          type: "select",
          itemsArr: [
            { id: "", value: "", name: t("filterBar.allBranches") },
            ...branches.map((branch) => ({ id: branch.id, value: branch.id, name: branch.name })),
          ],
        },
      ],
    },
  ];
};
