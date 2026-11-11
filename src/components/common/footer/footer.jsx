import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Col, Container, Row } from "react-bootstrap";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import { constants } from "../../../constants";
import { AppLink, ContactInfo, QuickLink } from "../../";
import "./footer.scss";

const {
  routes: {
    about,
    blog,
    campaigns,
    commercialRental,
    contact,
    faq,
    home,
    locations,
    longTermRental,
    privacyPolicy,
    reviews,
    vehicles,
  },
  website: { social = {} },
} = constants;

// react-icons 4.10 predates the X logo, so it's inlined (Simple Icons, CC0).
const XIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

// Only profiles filled in constants `website.social` render — an empty
// entry (account not opened yet) simply has no icon.
const socialLinks = [
  { key: "instagram", name: "Instagram", Icon: FaInstagram },
  { key: "facebook", name: "Facebook", Icon: FaFacebookF },
  { key: "youtube", name: "YouTube", Icon: FaYoutube },
  { key: "x", name: "X", Icon: XIcon },
].filter((network) => social[network.key]);

const quickLinks = [
  { direct: home, key: "home" },
  { direct: vehicles, key: "vehicles" },
  { direct: commercialRental, key: "commercialRental" },
  { direct: longTermRental, key: "longTermRental" },
  { direct: campaigns, key: "campaigns" },
  { direct: locations, key: "locations" },
  { direct: blog, key: "blog" },
  { direct: reviews, key: "reviews" },
  { direct: about, key: "about" },
  { direct: faq, key: "faq" },
  { direct: contact, key: "contact" },
  { direct: privacyPolicy, key: "privacyPolicy" },
];

const Footer = () => {
  const { pathname } = useLocation();
  const { t: tCommon } = useTranslation("common");
  const { t } = useTranslation("footer");
  const { t: tHeader } = useTranslation("header");
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <Container>
        <Row className="gy-5">
          <Col lg={6} xl={3}>
            <div className="site-footer__brand">
              <AppLink to={home} className="site-footer__logo">
                RENT<span>WIN</span>
              </AppLink>
              <p className="site-footer__slogan">{tHeader("slogan")}</p>
              <p className="site-footer__blurb">{t("blurb")}</p>
              {socialLinks.length > 0 && (
                <div className="site-footer__social">
                  <span className="site-footer__social-title">{t("followUs")}</span>
                  <ul>
                    {socialLinks.map(({ key, name, Icon }) => (
                      <li key={key}>
                        <a
                          href={social[key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t("socialLabel", { network: name })}
                          title={name}
                        >
                          <Icon />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Col>

          <Col lg={6} xl={3}>
            <h2>{t("quickLinks")}</h2>
            <ul className="site-footer__links">
              {quickLinks.map((item) => (
                <QuickLink
                  key={item.key}
                  pathname={pathname}
                  direct={item.direct}
                  text={tCommon(`nav.${item.key}`)}
                />
              ))}
            </ul>
          </Col>

          <Col lg={6} xl={3}>
            <h2>{t("workingHours")}</h2>
            <ul className="site-footer__hours">
              <li>{t("hours.weekdays")}</li>
              <li>{t("hours.saturday")}</li>
              <li>{t("hours.sunday")}</li>
            </ul>
          </Col>

          <Col lg={6} xl={3}>
            <h2>{t("contactUs")}</h2>
            <ContactInfo variant="plain" />
          </Col>
        </Row>

        <div className="site-footer__bottom">
          <p className="site-footer__copyright">© {year} {t("copyright")}</p>
          <p className="site-footer__credit">
            <a href="https://storyset.com/transport" target="_blank" rel="noopener noreferrer">
              Transport illustrations by Storyset
            </a>
          </p>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
