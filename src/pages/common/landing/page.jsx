import { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { BsArrowRight, BsCheck2, BsPersonWorkspace, BsTelephoneFill, BsWhatsapp } from "react-icons/bs";
import { PiBuildings, PiTruck, PiUsersThree, PiVan, PiWrench } from "react-icons/pi";
import { AppLink, JsonLd, Loading, PageHeader, Spacer, VehicleGridCard } from "../../../components";
import { usePageMeta, SITE_URL } from "../../../hooks/use-page-meta";
import { useLocale } from "../../../hooks/use-locale";
import { localizePath } from "../../../i18n/locale-routing";
import { breadcrumbLd, faqLd, itemListLd, serviceLd } from "../../../utils/seo";
import { groupFleetByModel } from "../../../utils/vehicle-model";
import { services } from "../../../services";
import { constants } from "../../../constants";
import "./style.scss";

const { routes, website } = constants;

const TYPE_ICONS = {
  van: <PiVan />,
  people: <PiUsersThree />,
  truck: <PiTruck />,
  building: <PiBuildings />,
  workspace: <BsPersonWorkspace />,
  tools: <PiWrench />,
};

// Which fleet models each landing page lists — one entry per model
// (groupFleetByModel), cheapest first. KEEP IN SYNC with
// backend/src/lib/seo-ld.js LANDING_PAGES (the bot prerender lists the same
// models, so a crawler and a browser see the same page).
const COMMERCIAL_BODY_TYPES = ["PANELVAN_MINIBUS", "KAMYONET"];
const priceOrLast = (value) => (Number(value) > 0 ? Number(value) : Infinity);
const byPrice = (field) => (a, b) =>
  priceOrLast(a[field]) - priceOrLast(b[field]) ||
  `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, "tr");
const VARIANTS = {
  commercial: {
    path: routes.commercialRental,
    relatedPath: routes.longTermRental,
    monthly: false,
    select: (models) =>
      models.filter((m) => m.bodyTypes.some((t) => COMMERCIAL_BODY_TYPES.includes(t))).sort(byPrice("dailyPrice")),
  },
  longTerm: {
    path: routes.longTermRental,
    relatedPath: routes.commercialRental,
    monthly: true,
    select: (models) => models.filter((m) => Number(m.monthlyPrice) > 0).sort(byPrice("monthlyPrice")),
  },
};

const vehicleName = (v) => [v.brand, v.model].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
const asArray = (value) => (Array.isArray(value) ? value : []);

// Service landing pages — /ticari-arac-kiralama and /uzun-donem-arac-kiralama
// (and their /en twins). One component, two copy blocks (locales/*/landing.json,
// which the backend bot prerender also reads directly) and two fleet filters.
const LandingPage = ({ variant }) => {
  const config = VARIANTS[variant];
  const locale = useLocale();
  const { t } = useTranslation("landing");
  const { t: tCommon } = useTranslation("common");
  const copy = t(variant, { returnObjects: true });

  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  usePageMeta({ title: copy.seoTitle, description: copy.seoDescription });

  const loadFleet = useCallback(() => {
    setLoading(true);
    setLoadFailed(false);
    // Every active unit (the fleet is a few dozen vehicles, one page holds
    // them all), grouped into one card per model below.
    services.vehicle
      .getVehiclesByPage(0, 500, "model", "ASC")
      .then((data) => setFleet(data?.content || []))
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadFleet();
  }, [loadFleet, retryCount]);

  const vehicles = useMemo(() => config.select(groupFleetByModel(fleet)), [config, fleet]);

  const fromPrice = useMemo(() => {
    const prices = vehicles
      .map((v) => Number(config.monthly ? v.monthlyPrice : v.dailyPrice))
      .filter((price) => price > 0);
    return prices.length ? Math.min(...prices) : null;
  }, [vehicles, config]);

  const itemListElement = useMemo(
    () =>
      vehicles.map((v, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: vehicleName(v),
        url: `${SITE_URL}${localizePath(`${routes.vehicles}/${v.id}`, locale)}`,
      })),
    [vehicles, locale]
  );

  const faq = asArray(copy.faq);

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbLd([{ name: tCommon("nav.home"), path: "/" }, { name: copy.pageTitle }])}
      />
      <JsonLd
        id="ld-service"
        data={serviceLd({
          name: copy.heading,
          serviceType: copy.serviceType,
          description: copy.seoDescription,
          path: config.path,
        })}
      />
      {faq.length > 0 && <JsonLd id="ld-faq" data={faqLd(faq)} />}
      {itemListElement.length > 0 && (
        <JsonLd id="ld-itemlist" data={itemListLd({ name: copy.fleetTitle, itemListElement })} />
      )}

      <PageHeader title={copy.heading} />
      <Spacer />

      <Container className="landing">
        <div className="landing__intro">
          <p className="landing__lead">{copy.lead}</p>
          {fromPrice && (
            <p className="landing__from">
              {t(config.monthly ? "shared.fromMonthly" : "shared.fromDaily", {
                price: fromPrice.toLocaleString("tr-TR"),
              })}
            </p>
          )}
          <div className="landing__actions">
            <a href="#filo" className="btn btn-primary">
              {t("shared.fleetCta")} <BsArrowRight />
            </a>
            <AppLink to={routes.contact} className="btn btn-outline-primary">
              {t("shared.quoteCta")}
            </AppLink>
          </div>
        </div>

        <Spacer />
        <section id="filo" className="landing__section">
          <h2 className="landing__title">{copy.fleetTitle}</h2>
          <p className="landing__subtitle">{copy.fleetIntro}</p>
          {loading ? (
            <Loading />
          ) : loadFailed ? (
            <div className="landing__notice">
              <p>{t("shared.loadError")}</p>
              <button type="button" className="btn btn-primary" onClick={() => setRetryCount((n) => n + 1)}>
                {t("shared.retry")}
              </button>
            </div>
          ) : vehicles.length === 0 ? (
            <p className="landing__notice">{t("shared.fleetEmpty")}</p>
          ) : (
            <div className="landing__grid">
              {vehicles.map((item) => (
                <VehicleGridCard key={item.id} {...item} rentalType={config.monthly ? "MONTHLY" : "DAILY"} />
              ))}
            </div>
          )}
        </section>

        <Spacer />
        <section className="landing__section">
          <h2 className="landing__title">{copy.typesTitle}</h2>
          <div className="landing__types">
            {asArray(copy.types).map((type) => (
              <article key={type.title} className="landing__type">
                <span className="landing__type-icon">{TYPE_ICONS[type.icon]}</span>
                <h3>{type.title}</h3>
                <p>{type.text}</p>
              </article>
            ))}
          </div>
        </section>

        <Spacer />
        <div className="landing__columns">
          <section>
            <h2 className="landing__title landing__title--left">{copy.whyTitle}</h2>
            <ul className="landing__why">
              {asArray(copy.why).map((item) => (
                <li key={item}>
                  <BsCheck2 /> <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="landing__title landing__title--left">{copy.howTitle}</h2>
            <ol className="landing__steps">
              {asArray(copy.how).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>
        </div>

        {faq.length > 0 && (
          <>
            <Spacer />
            <section className="landing__section landing__section--narrow">
              <h2 className="landing__title">{copy.faqTitle}</h2>
              <div className="landing__qa">
                {faq.map((item) => (
                  <div key={item.q} className="landing__qa-item">
                    <h3>{item.q}</h3>
                    <p>{item.a}</p>
                  </div>
                ))}
              </div>
              <p className="landing__more">
                {t("shared.faqMore")} <AppLink to={routes.faq}>{t("shared.faqMoreLink")}</AppLink>
                {t("shared.faqMoreSuffix")}
              </p>
            </section>
          </>
        )}

        <Spacer />
        <section className="landing__cta">
          <h2>{copy.ctaTitle}</h2>
          <p>{copy.ctaText}</p>
          <div className="landing__actions">
            <a href={`tel:${website.phoneE164}`} className="btn btn-primary">
              <BsTelephoneFill /> {t("shared.call", { phone: website.phone })}
            </a>
            <a href={website.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary">
              <BsWhatsapp /> {t("shared.whatsapp")}
            </a>
            <AppLink to={routes.contact} className="btn btn-outline-primary">
              {t("shared.contactForm")}
            </AppLink>
          </div>
        </section>

        <p className="landing__related">
          {copy.relatedLead}{" "}
          <AppLink to={config.relatedPath}>
            {copy.relatedLabel} <BsArrowRight />
          </AppLink>
        </p>
      </Container>
      <Spacer />
    </>
  );
};

export default LandingPage;
