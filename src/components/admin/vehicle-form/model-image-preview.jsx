import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BsImage } from "react-icons/bs";
import { services } from "../../../services";
import { constants } from "../../../constants";
import { utils } from "../../../utils";

const API_URL = import.meta.env.VITE_APP_API_URL;
const norm = (value) => (value || "").trim().toLocaleUpperCase("tr");

// Read-only: the image this vehicle shows comes from its make+model, managed on
// /admin/vehicles/model-images — never uploaded per vehicle. Every vehicle of
// that brand+model shares this one photo, so it's given an approximate tint
// toward this specific vehicle's own "Renk" value (see getVehicleColorTint) —
// otherwise a grey Egea would show whatever colour the shared photo happens
// to be in.
const ModelImagePreview = ({ brand, model, color }) => {
  const { t } = useTranslation("admin");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    services.vehicle.listModelImages().then(setRows).catch(() => setRows([]));
  }, []);

  const match = rows.find((r) => norm(r.brand) === norm(brand) && norm(r.model) === norm(model));
  const name = [brand, model].filter(Boolean).join(" ").trim();
  const tint = utils.functions.getVehicleColorTint(color);

  return (
    <div className="vehicle-form__model-image">
      <div className="vehicle-form__model-image-frame">
        {match?.image ? (
          <div className="vehicle-form__model-image-tint">
            <img
              src={`${API_URL}/files/display/${match.image.id}`}
              alt={name}
              style={tint?.type === "neutral" ? { filter: tint.filter } : undefined}
            />
            {tint?.type === "hue" && (
              <span
                className="vehicle-form__model-image-overlay"
                style={{ backgroundColor: tint.color, opacity: tint.opacity }}
              />
            )}
          </div>
        ) : (
          <div className="vehicle-form__model-image-empty">
            <BsImage />
            <span>{t("vehicles.modelImages.noImage")}</span>
          </div>
        )}
      </div>
      {name && (
        <p className="vehicle-form__model-image-hint">
          {t("vehicles.modelImages.formHint", { name })}
        </p>
      )}
      <Link to={constants.routes.adminVehicleModelImages} className="vehicle-form__model-image-link">
        {t("vehicles.modelImages.formManage")}
      </Link>
    </div>
  );
};

export default ModelImagePreview;
