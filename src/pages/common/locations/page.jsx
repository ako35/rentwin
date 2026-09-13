import { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { BsArrowRight, BsGeoAltFill } from "react-icons/bs";
import { AppLink, JsonLd, Loading, PageHeader, Spacer } from "../../../components";
import { usePageMeta, SITE_URL } from "../../../hooks/use-page-meta";
import { breadcrumbLd, itemListLd } from "../../../utils/seo";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { constants } from "../../../constants";
import { useLocale } from "../../../hooks/use-locale";
import { localizePath } from "../../../i18n/locale-routing";
import "./style.scss";

const { routes } = constants;
const API_URL = import.meta.env.VITE_APP_API_URL;

const LocationsPage = () => {
  const { t } = useTranslation("locations");
  const { t: tCommon } = useTranslation("common");
  const locale = useLocale();
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
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbLd([
          { name: tCommon("nav.home"), path: "/" },
          { name: t("pageTitle") },
        ])}
      />
      {!loading && locations.length > 0 && (
        <JsonLd
          id="ld-itemlist"
          data={itemListLd({
            name: t("pageTitle"),
            itemListElement: locations.map((loc, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: loc.name,
              url: `${SITE_URL}${localizePath(`${routes.locations}/${utils.functions.slugify(loc.name)}`, locale)}`,
            })),
          })}
        />
      )}
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
              <AppLink
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
              </AppLink>
            ))}
          </div>
        )}
      </Container>
      <Spacer />
    </>
  );
};

export default LocationsPage;
