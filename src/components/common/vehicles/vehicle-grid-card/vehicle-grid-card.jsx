import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GiGasPump, GiGearStick } from "react-icons/gi";
import { BsCalendar3 } from "react-icons/bs";
import { Button } from "react-bootstrap";
import { constants } from "../../../../constants";
import "./vehicle-grid-card.scss";

const { routes } = constants;
const API_URL = import.meta.env.VITE_APP_API_URL;

const VehicleGridCard = (props) => {
  const { t } = useTranslation("vehicles");
  const { t: tCommon } = useTranslation("common");
  const name = [props.brand, props.model].filter(Boolean).join(" ");

  return (
    <Link to={`${routes.vehicles}/${props.id}`} className="vehicle-grid-card">
      <div className="vehicle-grid-card__image">
        <img src={`${API_URL}/files/display/${props.image}`} alt={name} loading="lazy" />
      </div>

      <div className="vehicle-grid-card__body">
        <h4 className="vehicle-grid-card__name">{name}</h4>

        <div className="vehicle-grid-card__badges">
          <span className="vehicle-grid-card__badge">
            <GiGearStick /> {tCommon(`options.transmissionTypes.${props.transmission}`)}
          </span>
          <span className="vehicle-grid-card__badge">
            <GiGasPump /> {tCommon(`options.fuelTypes.${props.fuelType}`)}
          </span>
          {props.modelYear && (
            <span className="vehicle-grid-card__badge">
              <BsCalendar3 /> {props.modelYear}
            </span>
          )}
        </div>

        <Button className="vehicle-grid-card__cta">{t("card.rentNow")}</Button>
      </div>
    </Link>
  );
};

export default VehicleGridCard;
