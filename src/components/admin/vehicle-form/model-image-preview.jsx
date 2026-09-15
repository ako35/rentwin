import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BsImage } from "react-icons/bs";
import { services } from "../../../services";
import { constants } from "../../../constants";

const API_URL = import.meta.env.VITE_APP_API_URL;
const norm = (value) => (value || "").trim().toLocaleUpperCase("tr");

// Read-only: the image this vehicle shows comes from its make+model — and,
// when one's been set, this specific colour too — managed on
// /admin/vehicles/model-images, never uploaded per vehicle. Falls back to
// the model's generic (no-colour) image when no exact colour match exists.
const ModelImagePreview = ({ brand, model, color }) => {
  const { t } = useTranslation("admin");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    services.vehicle.listModelImages().then(setRows).catch(() => setRows([]));
  }, []);

  const group = rows.find((r) => norm(r.brand) === norm(brand) && norm(r.model) === norm(model));
  const colorMatch = group?.colors.find((c) => norm(c.color) === norm(color));
  const image = colorMatch?.image || group?.genericImage || null;
  const name = [brand, model].filter(Boolean).join(" ").trim();

  return (
    <div className="vehicle-form__model-image">
      <div className="vehicle-form__model-image-frame">
        {image ? (
          <img src={`${API_URL}/files/display/${image.id}`} alt={name} />
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
