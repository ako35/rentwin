import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { BsArrowRight, BsGeoAltFill } from "react-icons/bs";
import { Loading, PageHeader, Spacer } from "../../../components";
import { usePageMeta } from "../../../hooks/use-page-meta";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { constants } from "../../../constants";
import "./style.scss";

const { routes } = constants;
const API_URL = import.meta.env.VITE_APP_API_URL;

const LocationsPage = () => {
  const { t } = useTranslation("locations");
  usePageMeta(t("seoTitle"), t("seoDescription"));

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    services.location
      .getLocations()
      .then((data) => setLocations(data || []))
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title={t("pageTitle")} />
      <Spacer />
      <Container className="locations-page">
        <p className="locations-page__intro">{t("intro")}</p>

        {loading ? (
          <Loading height={300} />
        ) : locations.length === 0 ? (
          <p className="locations-page__empty">{t("empty")}</p>
        ) : (
          <div className="locations-page__grid">
            {locations.map((loc) => (
              <Link
                key={loc.id}
                to={`${routes.locations}/${utils.functions.slugify(loc.name)}`}
                className="location-card"
              >
                <span className="location-card__media">
                  {loc.imageId ? (
                    <img
                      src={`${API_URL}/files/display/${loc.imageId}`}
                      alt={loc.name}
                      loading="lazy"
                    />
                  ) : (
                    <BsGeoAltFill />
                  )}
                </span>
                <span className="location-card__body">
                  <span className="location-card__name">{loc.name}</span>
                  <span className="location-card__cta">
                    {t("cardCta")} <BsArrowRight />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </Container>
      <Spacer />
    </>
  );
};

export default LocationsPage;
