import {
  GiCarDoor,
  GiCarSeat,
  GiGearStickPattern,
  GiComputerFan,
  GiCalendarHalfYear,
} from "react-icons/gi";
import { FaCar } from "react-icons/fa";
import { MdOutlineLuggage } from "react-icons/md";
import { BsFuelPump } from "react-icons/bs";
import "./details-panel.scss";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Badge, Card, Col, Row } from "react-bootstrap";
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
      title: t("details.doors"),
      icon: <GiCarDoor />,
      info: vehicle?.doors,
    },
    {
      id: 3,
      title: t("details.seats"),
      icon: <GiCarSeat />,
      info: vehicle?.seats,
    },
    {
      id: 4,
      title: t("details.luggage"),
      icon: <MdOutlineLuggage />,
      info: vehicle?.luggage,
    },
    {
      id: 5,
      title: t("details.transmission"),
      icon: <GiGearStickPattern />,
      info: tCommon(`options.transmissionTypes.${vehicle?.transmission}`),
    },
    {
      id: 6,
      title: t("details.airConditioning"),
      icon: <GiComputerFan />,
      info: vehicle?.airConditioning ? t("details.yes") : t("details.no"),
    },
    {
      id: 7,
      title: t("details.fuelType"),
      icon: <BsFuelPump />,
      info: tCommon(`options.fuelTypes.${vehicle?.fuelType}`),
    },
    {
      id: 8,
      title: t("details.age"),
      icon: <GiCalendarHalfYear />,
      info: vehicle?.age,
    },
  ];
  return (
    <div className="details-panel">
      <div className="panel-title">
        <h1 className="text-primary">{vehicle?.model}</h1>
        <h3>
          <Badge>{t("details.pricePerHour", { price: vehicle?.pricePerHour })}</Badge>
        </h3>
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
