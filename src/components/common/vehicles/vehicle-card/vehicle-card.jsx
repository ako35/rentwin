import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { constants } from "../../../../constants"
import { GiGasPump, GiGearStick } from "react-icons/gi"
import { Button } from "react-bootstrap"
import './vehicle-card.scss'

const { routes } = constants

const API_URL = import.meta.env.VITE_APP_API_URL

const VehicleCard = (props) => {
  const { t } = useTranslation("vehicles");
  const { t: tCommon } = useTranslation("common");

  return (
    <Link to={`${routes.vehicles}/${props.id}`}>
      <div className="vehicle-card">
        <div className="image">
          <img src={`${API_URL}/files/display/${props.image}`} alt="" />
        </div>
        <h4>{props.model}</h4>
        <div className="details">
          <div>
            <GiGearStick /> {tCommon(`options.transmissionTypes.${props.transmission}`)}
          </div>
          <div>
            <GiGasPump /> {tCommon(`options.fuelTypes.${props.fuelType}`)}
          </div>
        </div>
        <Button>{t("card.rentNow")}</Button>
      </div>
    </Link>
  )
}

export default VehicleCard