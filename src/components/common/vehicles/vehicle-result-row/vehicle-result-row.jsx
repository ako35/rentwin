import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GiGasPump, GiGearStick } from "react-icons/gi";
import { Button } from "react-bootstrap";
import { constants } from "../../../../constants";
import "./vehicle-result-row.scss";

const { routes } = constants;
const API_URL = import.meta.env.VITE_APP_API_URL;

const VehicleResultRow = (props) => {
  const { t } = useTranslation("vehicles");
  const { t: tCommon } = useTranslation("common");
  const name = [props.brand, props.model].filter(Boolean).join(" ");

  return (
    <Link to={`${routes.vehicles}/${props.id}`} className="vehicle-result-row">
      <div className="vehicle-result-row__image">
        <img src={`${API_URL}/files/display/${props.image}`} alt={name} loading="lazy" />
      </div>

      <div className="vehicle-result-row__body">
        <h4>{name}</h4>
        <div className="vehicle-result-row__specs">
          <span><GiGearStick /> {tCommon(`options.transmissionTypes.${props.transmission}`)}</span>
          <span><GiGasPump /> {tCommon(`options.fuelTypes.${props.fuelType}`)}</span>
          {props.modelYear && <span className="vehicle-result-row__year">{props.modelYear}</span>}
        </div>
      </div>

      <div className="vehicle-result-row__action">
        <Button>{t("card.rentNow")}</Button>
      </div>
    </Link>
  );
};

export default VehicleResultRow;
