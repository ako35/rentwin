import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { BsArrowRight, BsCheck2, BsGeoAltFill } from "react-icons/bs";
import { JsonLd, Loading, PageHeader, Spacer } from "../../../../components";
import { usePageMeta } from "../../../../hooks/use-page-meta";
import { breadcrumbLd } from "../../../../utils/seo";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { constants } from "../../../../constants";
import "../style.scss";

const { routes } = constants;
const API_URL = import.meta.env.VITE_APP_API_URL;

const LocationDetailPage = () => {
  const { slug } = useParams();
  const { t } = useTranslation("locations");
  const { t: tCommon } = useTranslation("common");

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    services.location
      .getLocations()
      .then((data) => setLocations(data || []))
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, []);

  const location = useMemo(
    () => locations.find((l) => utils.functions.slugify(l.name) === slug),
    [locations, slug]
  );
  const name = location?.name || "";
  const missing = !loading && !location;

  usePageMeta({
    title: name ? t("detail.seoTitle", { name }) : t("seoTitle"),
    description: name ? t("detail.seoDescription", { name }) : t("seoDescription"),
    noindex: missing,
    statusCode: missing ? 404 : undefined,
  });

  if (loading) return <Loading height={400} />;

  if (!location) {
    return (
      <Container className="locations-page">
        <Spacer />
        <p className="locations-page__empty">{t("detail.notFound")}</p>
        <p>
          <Link to={routes.locations}>{t("detail.backToList")}</Link>
        </p>
        <Spacer />
      </Container>
    );
  }

  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(`${name} İzmir`)}&output=embed`;
  const bullets = t("detail.why", { name, returnObjects: true });

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbLd([
          { name: tCommon("nav.home"), path: "/" },
          { name: t("pageTitle"), path: routes.locations },
          { name },
        ])}
      />
      <PageHeader title={t("detail.heading", { name })} />
      <Spacer />
      <Container className="location-detail">
        <Link to={routes.locations} className="location-detail__back">
          &larr; {t("detail.backToList")}
        </Link>

        {location.imageId && (
          <div className="location-detail__hero">
            <img src={`${API_URL}/files/display/${location.imageId}`} alt={name} />
          </div>
        )}

        <p className="location-detail__lead">{t("detail.lead", { name })}</p>

        <div className="location-detail__actions">
          <Link to={routes.vehicles} className="btn btn-primary">
            {t("detail.vehiclesCta")} <BsArrowRight />
          </Link>
          <Link to={routes.home} className="btn btn-outline-primary">
            {t("detail.reserveCta")}
          </Link>
        </div>

        <Spacer />
        <h2 className="location-detail__subtitle">{t("detail.whyTitle", { name })}</h2>
        <ul className="location-detail__list">
          {(Array.isArray(bullets) ? bullets : []).map((item, index) => (
            <li key={index}>
              <BsCheck2 /> {item}
            </li>
          ))}
        </ul>

        <Spacer />
        <h2 className="location-detail__subtitle">
          <BsGeoAltFill /> {t("detail.mapTitle", { name })}
        </h2>
        <div className="location-detail__map">
          <iframe
            title={t("detail.mapTitle", { name })}
            src={mapSrc}
            loading="lazy"
            allowFullScreen=""
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </Container>
      <Spacer />
    </>
  );
};

export default LocationDetailPage;
