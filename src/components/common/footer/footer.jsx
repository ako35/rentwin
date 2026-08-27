import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { constants } from "../../../constants";
import "./footer.scss";
import { Col, Container, Row } from "react-bootstrap";
import { ContactInfo, QuickLink } from "../../";
import { BsHeadphones, BsInfoCircleFill, BsCarFrontFill } from "react-icons/bs";
import { MdPrivacyTip } from "react-icons/md";
import { ImHome } from "react-icons/im";

const {
  routes: { about, contact, home, privacyPolicy, vehicles },
} = constants;

const quickLinks = [
  {
    direct: home,
    icon: <ImHome />,
    key: "home",
  },
  {
    direct: vehicles,
    icon: <BsCarFrontFill />,
    key: "vehicles",
  },
  {
    direct: about,
    icon: <BsInfoCircleFill />,
    key: "about",
  },
  {
    direct: contact,
    icon: <BsHeadphones />,
    key: "contact",
  },
  {
    direct: privacyPolicy,
    icon: <MdPrivacyTip />,
    key: "privacyPolicy",
  },
];

const Footer = () => {
  const { pathname } = useLocation();
  const { t: tCommon } = useTranslation("common");
  const { t } = useTranslation("footer");
  const { t: tHeader } = useTranslation("header");

  return (
    <footer>
      <Container>
        <Row className="text-primary">
          <Col lg={6} xl={3}>
            <Link to={home}>
              <div className="logo">
                <div className="logo_text">
                  RENT<span>WIN</span>
                  <p>{tHeader('slogan')}</p>
                </div>
              </div>
            </Link>
          </Col>
          <Col lg={6} xl={3}>
            <h2>{t('quickLinks')}</h2>
            <ul>
              {
                quickLinks.map(item => (
                  <QuickLink key={item.key} pathname={pathname} direct={item.direct} icon={item.icon} text={tCommon(`nav.${item.key}`)} />
                ))
              }
            </ul>
          </Col>
          <Col lg={6} xl={3}>
            <h2>{t('workingHours')}</h2>
            <ul>
              <li>{t('hours.weekdays')}</li>
              <li>{t('hours.saturday')}</li>
              <li>{t('hours.sunday')}</li>
            </ul>
          </Col>
          <Col lg={6} xl={3}>
            <h2>{t('contactUs')}</h2>
            <ContactInfo />
          </Col>
        </Row>
        <Row>
          <p className="footer_text">{t('copyright')}</p>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
