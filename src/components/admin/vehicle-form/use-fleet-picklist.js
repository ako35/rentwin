import { useEffect, useMemo, useState } from "react";
import { services } from "../../../services";

// Loads branches + the distinct brand/model pairs already in the fleet, and
// derives the brand/model combobox option lists for the vehicle form.
export const useFleetPicklist = (formik) => {
  const [branches, setBranches] = useState([]);
  const [fleet, setFleet] = useState([]);

  useEffect(() => {
    services.branch.getBranches().then(setBranches).catch(() => setBranches([]));
    services.vehicle
      .getVehicles()
      .then((list) =>
        setFleet(
          (list || [])
            .map((v) => ({ brand: (v.brand || "").trim(), model: (v.model || "").trim() }))
            .filter((v) => v.brand || v.model)
        )
      )
      .catch(() => setFleet([]));
  }, []);

  const selectedBrand = (formik.values.brand || "").trim().toLowerCase();

  const brandOptions = useMemo(
    () => [...new Set(fleet.map((v) => v.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [fleet]
  );

  // Models already used for the selected brand; falls back to every known model
  // when the brand is new / unmatched.
  const modelOptions = useMemo(() => {
    const forBrand = fleet.filter((v) => v.brand.toLowerCase() === selectedBrand && v.model);
    const source = forBrand.length ? forBrand : fleet;
    return [...new Set(source.map((v) => v.model).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [fleet, selectedBrand]);

  // Picking a model that belongs to exactly one brand in the fleet auto-fills Marka.
  const handleModelPicked = (model) => {
    const key = model.trim().toLowerCase();
    if (!key) return;
    const matchedBrands = [
      ...new Set(fleet.filter((v) => v.model.toLowerCase() === key).map((v) => v.brand).filter(Boolean)),
    ];
    if (matchedBrands.length === 1 && matchedBrands[0] !== formik.values.brand) {
      formik.setFieldValue("brand", matchedBrands[0]);
    }
  };

  return { branches, brandOptions, modelOptions, handleModelPicked };
};
