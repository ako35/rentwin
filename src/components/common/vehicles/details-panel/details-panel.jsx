import { GiGearStickPattern } from "react-icons/gi";
import { FaCar } from "react-icons/fa";
import { BsFuelPump } from "react-icons/bs";
import "./details-panel.scss";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Card, Col, Row } from "react-bootstrap";
import { Spacer } from "../../../";

const API_URL = import.meta.env.VITE_APP_API_URL;

const DetailsPanel = () => {
  const vehicle = useSelector((state) => state.reservation.vehicle);
  const { t } = useTranslation("vehicles");
  const { t: tCommon } = useTranslation("common");

  const carDetails = [
    {
      id: 1,
      title: t("details.model"),
      icon: <FaCar />,
      info: vehicle?.model,
    },
    {
      id: 2,
      title: t("details.transmission"),
      icon: <GiGearStickPattern />,
      info: tCommon(`options.transmissionTypes.${vehicle?.transmission}`),
    },
    {
      id: 3,
      title: t("details.fuelType"),
      icon: <BsFuelPump />,
      info: tCommon(`options.fuelTypes.${vehicle?.fuelType}`),
    },
  ];
  return (
    <div className="details-panel">
      <div className="panel-title">
        <h1 className="text-primary">{vehicle?.model}</h1>
      </div>
      <Card>
        <img
          src={`${API_URL}/files/display/${vehicle?.image}`}
          alt={vehicle?.model}
          title={vehicle?.model}
          loading="lazy"
        />
      </Card>
      <Spacer />
      <h2 className="text-primary">{t("details.propertyHighlights")}</h2>
      <Row xs={2} md={4}>
        {carDetails.map((item) => (
          <Col key={item.id} title={DetailsPanel.title}>
            {item.icon}
            <span>{item.title}</span>
            {item.info}
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default DetailsPanel;
