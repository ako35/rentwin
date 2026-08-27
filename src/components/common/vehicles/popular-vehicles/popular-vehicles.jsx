import { Col, Container, Row } from "react-bootstrap";
import { Loading, SectionHeader, Spacer, VehicleCard } from "../../../";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { services } from "../../../../services";
import './popular-vehicles.scss'

const PopularVehicles = () => {
  const { t } = useTranslation("home");
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);

  const loadData = async () => {
    try {
      const vehicleData = await services.vehicle.getVehiclesByPage();
      const { content } = vehicleData;
      setVehicles(content);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="popular-vehicles">
      <SectionHeader
        title1={t("sections.popularCars.title1")}
        title2={t("sections.popularCars.title2")}
        desc={t("sections.popularCars.desc")}
      />
      <Spacer />
      <Container>
        <Row className="gy-5">
          {
            loading ? <Loading /> : vehicles && vehicles.map((item, index) => (
              <Col md={6} lg={4} key={item?.id || index}>
                <VehicleCard {...item} />
              </Col>
            ))
          }
        </Row>
      </Container>
    </div>
  );
};

export default PopularVehicles;
