import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { BsArrowRight, BsCheck2, BsGeoAltFill } from "react-icons/bs";
import { AppLink, JsonLd, Loading, MapEmbed, PageHeader, Spacer } from "../../../../components";
import { usePageMeta } from "../../../../hooks/use-page-meta";
import { breadcrumbLd, faqLd } from "../../../../utils/seo";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { constants } from "../../../../constants";
import { responsiveImage } from "../../../../utils/image-url";
import "../style.scss";

const { routes } = constants;
const HERO_IMAGE = { widths: [480, 640, 960, 1280], fallback: 960, sizes: "(max-width: 1200px) 92vw, 1100px" };

const LocationDetailPage = () => {
  const { slug } = useParams();
  const { t } = useTranslation("locations");
  const { t: tCommon } = useTranslation("common");

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const loadLocations = useCallback(() => {
    setLoading(true);
    setLoadFailed(false);
    services.location
      .getLocations()
      .then((data) => setLocations(data || []))
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations, retryCount]);

  const location = useMemo(
    () => locations.find((l) => utils.functions.slugify(l.name) === slug),
    [locations, slug]
  );
  const name = location?.name || "";
  // Only a successfully loaded list that just doesn't contain this slug means
  // the location is actually gone — a failed fetch (which also leaves
  // `location` unset) must not noindex an otherwise-live page. The "not
  // found" UI below still covers both cases (it keys off `location` being
  // unset), only the SEO signal changes.
  const missing = !loading && !loadFailed && !location;
  // Per-slug title/description/H1 (detail.overrides) — Aliağa is the home
  // office; the homepage owns "Aliağa Araç Kiralama", so this page targets the
  // office itself. Mirrored in backend/src/lib/seo-ld.js LOCATION_META_OVERRIDES.
  const override = t(`detail.overrides.${slug}`, { returnObjects: true, defaultValue: null });
  const meta = override && typeof override === "object" ? override : null;

  usePageMeta({
    title: name ? meta?.seoTitle || t("detail.seoTitle", { name }) : t("seoTitle"),
    description: name ? meta?.seoDescription || t("detail.seoDescription", { name }) : t("seoDescription"),
    noindex: missing,
    statusCode: missing ? 404 : undefined,
  });

  if (loading) return <Loading height={400} />;

  if (loadFailed) {
    return (
      <Container className="locations-page">
        <Spacer />
        <p className="locations-page__empty">{t("detail.loadError")}</p>
        <p className="text-center">
          <button type="button" className="btn btn-primary" onClick={() => setRetryCount((count) => count + 1)}>
            {t("detail.retry")}
          </button>
        </p>
        <p className="text-center">
          <AppLink to={routes.locations}>{t("detail.backToList")}</AppLink>
        </p>
        <Spacer />
      </Container>
    );
  }

  if (!location) {
    return (
      <Container className="locations-page">
        <Spacer />
        <p className="locations-page__empty">{t("detail.notFound")}</p>
        <p>
          <AppLink to={routes.locations}>{t("detail.backToList")}</AppLink>
        </p>
        <Spacer />
      </Container>
    );
  }

  const isOffice = slug === "aliaga";
  const { website } = constants;
  const mapSrc = isOffice
    ? website.mapEmbedUrl
    : `https://www.google.com/maps?q=${encodeURIComponent(`${name} İzmir`)}&output=embed`;
  const mapOpenUrl = isOffice
    ? website.mapUrl
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} İzmir`)}`;
  const mapCaption = isOffice
    ? `${website.streetAddress}, ${website.postalCode} ${website.addressLocality}/${website.addressRegion}`
    : name;
  // A location with its own copy (detail.local.<slug>) replaces the shared
  // lead / why / how template — with only the name swapped in, the location
  // pages read alike and Search Console folded them into one another.
  // Mirrored in backend/src/lib/seo-ld.js LOCATION_LOCAL_COPY.
  const localRaw = t(`detail.local.${slug}`, { returnObjects: true, defaultValue: null });
  const local = localRaw && typeof localRaw === "object" ? localRaw : null;
  const lead = local?.lead || t("detail.lead", { name });
  const bullets = Array.isArray(local?.why) ? local.why : t("detail.why", { name, returnObjects: true });
  const steps = Array.isArray(local?.how) ? local.how : t("detail.how", { name, returnObjects: true });

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
      <PageHeader
        title={meta?.heading || t("detail.heading", { name })}
        crumbs={[{ label: t("pageTitle"), to: routes.locations }]}
      />
      <Spacer />
      <Container className="location-detail">
        <AppLink to={routes.locations} className="location-detail__back">
          &larr; {t("detail.backToList")}
        </AppLink>

        {location.imageId && (
          <div className="location-detail__hero">
            <img {...responsiveImage(location.imageId, HERO_IMAGE)} alt={name} decoding="async" />
          </div>
        )}

        <p className="location-detail__lead">{lead}</p>

        <div className="location-detail__actions">
          <AppLink to={routes.vehicles} className="btn btn-primary">
            {t("detail.vehiclesCta")} <BsArrowRight />
          </AppLink>
          <AppLink to={routes.home} className="btn btn-outline-primary">
            {t("detail.reserveCta")}
          </AppLink>
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
        <h2 className="location-detail__subtitle">{t("detail.howTitle", { name })}</h2>
        <ol className="location-detail__steps">
          {(Array.isArray(steps) ? steps : []).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
        <p className="location-detail__faq">
          {t("detail.faqLead")}{" "}
          <AppLink to={routes.faq}>{t("detail.faqLink")}</AppLink>
        </p>

        {local && (
          <>
            <Spacer />
            <h2 className="location-detail__subtitle">{local.title}</h2>
            {(Array.isArray(local.paragraphs) ? local.paragraphs : []).map((paragraph, index) => (
              <p key={index} className="location-detail__local-paragraph">
                {paragraph}
              </p>
            ))}
          </>
        )}

        {Array.isArray(local?.faq) && local.faq.length > 0 && (
          <>
            <JsonLd id="ld-location-faq" data={faqLd(local.faq)} />
            <Spacer />
            <h2 className="location-detail__subtitle">{local.faqTitle}</h2>
            <div className="location-detail__qa">
              {local.faq.map((item) => (
                <div key={item.q} className="location-detail__qa-item">
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <Spacer />
        <h2 className="location-detail__subtitle">
          <BsGeoAltFill /> {t("detail.mapTitle", { name })}
        </h2>
        <div className="location-detail__map">
          <MapEmbed
            title={t("detail.mapTitle", { name })}
            src={mapSrc}
            openUrl={mapOpenUrl}
            caption={mapCaption}
            height={420}
          />
        </div>
      </Container>
      <Spacer />
    </>
  );
};

export default LocationDetailPage;
