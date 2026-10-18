import { GiGearStickPattern } from "react-icons/gi";
import { FaCar } from "react-icons/fa";
import { BsFuelPump, BsTag, BsCashStack } from "react-icons/bs";
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
  const vehicleName = [vehicle?.brand, vehicle?.model].filter(Boolean).join(" ");

  const carDetails = [
    {
      id: 1,
      title: t("details.model"),
      icon: <FaCar />,
      info: vehicleName,
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
  if (vehicle?.dailyPrice) {
    carDetails.push({
      id: 4,
      title: t("details.dailyPrice"),
      icon: <BsTag />,
      info: `${Number(vehicle.dailyPrice).toLocaleString("tr-TR")} TL`,
    });
  }
  if (vehicle?.monthlyPrice) {
    carDetails.push({
      id: 5,
      title: t("details.monthlyPrice"),
      icon: <BsCashStack />,
      info: `${Number(vehicle.monthlyPrice).toLocaleString("tr-TR")} TL ${t("details.plusVat")}`,
    });
  }

  // A per-vehicle sentence (brand/model/year/transmission/fuel combination
  // is rarely identical across the fleet) so each detail page carries some
  // unique text instead of just a photo + spec table — thin, templated-looking
  // pages are exactly what search engines are slow to index on a new domain.
  const description = vehicle
    ? t(vehicle.modelYear ? "details.descriptionWithYear" : "details.description", {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.modelYear,
        transmission: tCommon(`options.transmissionTypes.${vehicle.transmission}`),
        fuel: tCommon(`options.fuelTypes.${vehicle.fuelType}`),
      })
    : "";

  return (
    <div className="details-panel">
      <div className="panel-title">
        <h2 className="text-primary">{vehicleName}</h2>
      </div>
      <Card>
        <img
          src={`${API_URL}/files/display/${vehicle?.image}`}
          alt={vehicleName}
          title={vehicleName}
          loading="lazy"
        />
      </Card>
      <Spacer />
      <p className="details-panel__description">{description}</p>
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
