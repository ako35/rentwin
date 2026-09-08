import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Col, Container, Row } from "react-bootstrap";
import { BsInstagram, BsFacebook, BsLinkedin } from "react-icons/bs";
import { constants } from "../../../constants";
import { ContactInfo, QuickLink } from "../../";
import "./footer.scss";

const {
  routes: { about, contact, faq, home, locations, privacyPolicy, vehicles },
  website: { instagram, facebook, linkedin },
} = constants;

const quickLinks = [
  { direct: home, key: "home" },
  { direct: vehicles, key: "vehicles" },
  { direct: locations, key: "locations" },
  { direct: about, key: "about" },
  { direct: faq, key: "faq" },
  { direct: contact, key: "contact" },
  { direct: privacyPolicy, key: "privacyPolicy" },
];

const socials = [
  { title: "Instagram", url: instagram, icon: <BsInstagram /> },
  { title: "Facebook", url: facebook, icon: <BsFacebook /> },
  { title: "LinkedIn", url: linkedin, icon: <BsLinkedin /> },
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
              <Link to={home} className="site-footer__logo">
                RENT<span>WIN</span>
              </Link>
              <p className="site-footer__slogan">{tHeader("slogan")}</p>
              <p className="site-footer__blurb">{t("blurb")}</p>
              <ul className="site-footer__social">
                {socials.map((s) => (
                  <li key={s.title}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.title}>
                      {s.icon}
                    </a>
                  </li>
                ))}
              </ul>
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
