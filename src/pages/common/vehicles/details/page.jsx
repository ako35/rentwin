import { Col, Container, Row } from "react-bootstrap";
import { useParams } from "react-router-dom";
import {
  AppLink,
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
  // `notFound` (backend-confirmed: deleted/sold vehicle) drives noindex — a
  // transient network/server error must never tell search engines a live
  // listing is gone. `loadFailed` covers both cases for the fallback UI, same
  // as before this split. (Production Search Console flagged several active
  // vehicles as noindex-excluded — traced to this catch-all treating any
  // fetch failure, e.g. a cold-start timeout during a crawl, as "missing".)
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const { vehicleId } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation("vehicles");
  const { t: tCommon } = useTranslation("common");

  const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}`.trim() : "";
  const imageId = Array.isArray(vehicle?.image) ? vehicle.image[0] : vehicle?.image;
  const imageUrl = imageId ? `${API_URL}/files/display/${imageId}` : undefined;

  usePageMeta({
    title: vehicleName ? t("seoDetailsTitle", { name: vehicleName }) : t("detailsPageTitle"),
    description: vehicleName ? t("seoDetailsDescription", { name: vehicleName }) : undefined,
    image: imageUrl,
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
      if (error?.response?.status === 404) setNotFound(true);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadFailed) {
    return (
      <>
        <PageHeader
          title={t("detailsPageTitle")}
          crumbs={[{ label: tCommon("nav.vehicles"), to: "/vehicles" }]}
        />
        <Spacer />
        <Container className="vehicle-details">
          <p>{t("loadError")}</p>
          <AppLink to="/vehicles">{tCommon("nav.vehicles")}</AppLink>
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
              image: imageUrl,
              transmission: vehicle.transmission,
              fuelType: vehicle.fuelType,
              modelYear: vehicle.modelYear,
              color: vehicle.color,
              path: `/vehicles/${vehicleId}`,
            })}
          />
        </>
      )}
      <PageHeader
        title={vehicleName || t("detailsPageTitle")}
        crumbs={[{ label: tCommon("nav.vehicles"), to: "/vehicles" }]}
      />
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
