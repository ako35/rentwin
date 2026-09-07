import { Container } from "react-bootstrap";
import { Loading, SectionHeader, Spacer, VehicleGridCard } from "../../../";
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
        {loading ? (
          <Loading />
        ) : (
          <div className="popular-vehicles__grid">
            {vehicles.map((item, index) => (
              <VehicleGridCard key={item?.id || index} {...item} />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
};

export default PopularVehicles;
