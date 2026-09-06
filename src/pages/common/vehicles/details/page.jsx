import { Col, Container, Row } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import {
  BookingForm,
  DetailsPanel,
  JsonLd,
  Loading,
  PageHeader,
  Spacer,
} from "../../../../components";
import { useEffect, useState } from "react";
import { services } from "../../../../services";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { setVehicle } from "../../../../store";
import { usePageMeta } from "../../../../hooks/use-page-meta";
import { breadcrumbLd, vehicleLd } from "../../../../utils/seo";

const API_URL = import.meta.env.VITE_APP_API_URL;

const VehicleDetailsPage = () => {
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicleState] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const { vehicleId } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation("vehicles");
  const { t: tCommon } = useTranslation("common");

  const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}`.trim() : "";

  usePageMeta({
    title: vehicleName ? t("seoDetailsTitle", { name: vehicleName }) : t("detailsPageTitle"),
    description: vehicleName ? t("seoDetailsDescription", { name: vehicleName }) : undefined,
    image: vehicle?.image ? `${API_URL}/files/display/${vehicle.image}` : undefined,
    type: "product",
    noindex: notFound,
    statusCode: notFound ? 404 : undefined,
  });

  const loadData = async () => {
    try {
      const data = await services.vehicle.getVehicleById(vehicleId);
      dispatch(setVehicle(data));
      setVehicleState(data);
    } catch (error) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (notFound) {
    return (
      <>
        <PageHeader title={t("detailsPageTitle")} />
        <Spacer />
        <Container className="vehicle-details">
          <p>{t("loadError")}</p>
          <Link to="/vehicles">{tCommon("nav.vehicles")}</Link>
        </Container>
        <Spacer />
      </>
    );
  }

  return (
    <>
      {vehicle && (
        <>
          <JsonLd
            id="ld-breadcrumb"
            data={breadcrumbLd([
              { name: tCommon("nav.home"), path: "/" },
              { name: tCommon("nav.vehicles"), path: "/vehicles" },
              { name: vehicleName },
            ])}
          />
          <JsonLd
            id="ld-vehicle"
            data={vehicleLd({
              name: vehicleName,
              brand: vehicle.brand,
              model: vehicle.model,
              image: vehicle.image ? `${API_URL}/files/display/${vehicle.image}` : undefined,
              transmission: vehicle.transmission,
              fuelType: vehicle.fuelType,
              path: `/vehicles/${vehicleId}`,
            })}
          />
        </>
      )}
      <PageHeader title={vehicleName || t("detailsPageTitle")} />
      <Spacer height={50} />
      <Container className="vehicle-details">
        <Row>
          {loading ? (
            <Loading height="500px" />
          ) : (
            <>
              <Col xl={8}>
                <DetailsPanel />
              </Col>
              <Col xl={4}>
                <BookingForm />
              </Col>
            </>
          )}
        </Row>
      </Container>
      <Spacer />
    </>
  );
};

export default VehicleDetailsPage;
