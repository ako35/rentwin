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
  VehicleGridCard,
} from "../../../../components";
import { useEffect, useState } from "react";
import { services } from "../../../../services";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { setVehicle } from "../../../../store";
import { usePageMeta } from "../../../../hooks/use-page-meta";
import { breadcrumbLd, vehicleLd } from "../../../../utils/seo";
import "./style.scss";

const API_URL = import.meta.env.VITE_APP_API_URL;

const VehicleDetailsPage = () => {
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicleState] = useState(null);
  const [related, setRelated] = useState([]);
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

  // Best-effort — a few other in-service vehicles to link to from this page
  // ("Benzer Araçlar"). Never blocks or fails the main page: an empty list
  // just hides the section.
  const loadRelated = async (excludeId) => {
    try {
      const { content } = await services.vehicle.getVehiclesByPage(0, 5);
      setRelated((content || []).filter((item) => item.id !== excludeId).slice(0, 4));
    } catch (error) {
      setRelated([]);
    }
  };

  useEffect(() => {
    // Clicking a "Benzer Araçlar" card keeps this same route component
    // mounted with a new :vehicleId param — without resetting these, a page
    // that 404'd (or failed to load) would keep showing that state forever
    // for every vehicle visited afterwards.
    setLoading(true);
    setNotFound(false);
    setLoadFailed(false);
    loadData();
    loadRelated(vehicleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

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
              dailyPrice: vehicle.dailyPrice,
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
      {!loading && related.length > 0 && (
        <>
          <Spacer />
          <Container as="section" className="vehicle-details__related">
            <h2>{t("details.relatedTitle")}</h2>
            <div className="vehicle-details__related-grid">
              {related.map((item) => (
                <VehicleGridCard key={item.id} {...item} />
              ))}
            </div>
          </Container>
        </>
      )}
      <Spacer />
    </>
  );
};

export default VehicleDetailsPage;
