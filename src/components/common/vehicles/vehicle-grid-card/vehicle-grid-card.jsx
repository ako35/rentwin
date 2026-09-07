import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GiGasPump, GiGearStick } from "react-icons/gi";
import { BsCalendar3, BsArrowRight } from "react-icons/bs";
import { constants } from "../../../../constants";
import "./vehicle-grid-card.scss";

const { routes } = constants;
const API_URL = import.meta.env.VITE_APP_API_URL;

// One vehicle in the marketing grid / homepage rail: photo on a fixed light
// ground, dark bold name, an inline spec row (transmission · fuel · year) and
// a footer pairing the quote hint with the "Şimdi Kirala" action. The whole
// card is the link; the action is a styled span, not a nested <button>.
const VehicleGridCard = (props) => {
  const { t } = useTranslation("vehicles");
  const { t: tCommon } = useTranslation("common");
  const name = [props.brand, props.model].filter(Boolean).join(" ");

  const specs = [
    { icon: <GiGearStick />, label: tCommon(`options.transmissionTypes.${props.transmission}`) },
    { icon: <GiGasPump />, label: tCommon(`options.fuelTypes.${props.fuelType}`) },
  ];
  if (props.modelYear) specs.push({ icon: <BsCalendar3 />, label: String(props.modelYear) });

  const imageId = Array.isArray(props.image) ? props.image[0] : props.image;

  return (
    <Link to={`${routes.vehicles}/${props.id}`} className="vehicle-grid-card">
      <div className="vehicle-grid-card__image">
        {imageId ? (
          <img
            src={`${API_URL}/files/display/${imageId}`}
            alt={name}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="vehicle-grid-card__noimg">{name}</span>
        )}
      </div>

      <div className="vehicle-grid-card__body">
        <h3 className="vehicle-grid-card__name">{name}</h3>

        <ul className="vehicle-grid-card__specs">
          {specs.map((spec) => (
            <li key={spec.label}>
              {spec.icon}
              <span>{spec.label}</span>
            </li>
          ))}
        </ul>

        <div className="vehicle-grid-card__foot">
          <span className="vehicle-grid-card__quote">{t("card.quoteHint")}</span>
          <span className="vehicle-grid-card__cta">
            {t("card.rentNow")} <BsArrowRight />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default VehicleGridCard;
