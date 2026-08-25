import { Link, useLocation } from "react-router-dom";
import { constants } from "../../../constants";
import "./footer.scss";
import { Col, Container, Row } from "react-bootstrap";
import { ContactInfo, QuickLink } from "../../";
import { BsHeadphones, BsInfoCircleFill, BsCarFrontFill } from "react-icons/bs";
import { MdPrivacyTip } from "react-icons/md";
import { ImHome } from "react-icons/im";

const {
  routes: { about, contact, home, privacyPolicy, vehicles },
  website: { footer },
} = constants;

const quickLinks = [
  {
    direct: home,
    icon: <ImHome />,
    text: "Home",
  },
  {
    direct: vehicles,
    icon: <BsCarFrontFill />,
    text: "Vehicles",
  },
  {
    direct: about,
    icon: <BsInfoCircleFill />,
    text: "About Us",
  },
  {
    direct: contact,
    icon: <BsHeadphones />,
    text: "Contact Us",
  },
  {
    direct: privacyPolicy,
    icon: <MdPrivacyTip />,
    text: "Privacy Policy",
  },
];

const Footer = () => {
  const { pathname } = useLocation();

  return (
    <footer>
      <Container>
        <Row className="text-primary">
          <Col lg={6} xl={3}>
            <Link to={home}>
              <div className="logo">
                <div className="logo_text">
                  RENT<span>WIN</span>
                  <p>YOUR RELIABLE RIDE, AS LONG AS YOU NEED</p>
                </div>
              </div>
            </Link>
          </Col>
          <Col lg={6} xl={3}>
            <h2>QuickLinks</h2>
            <ul>
              {
                quickLinks.map(item => (
                  <QuickLink key={item.text} pathname={pathname} {...item} />
                ))
              }
            </ul>
          </Col>
          <Col lg={6} xl={3}>
            <h2>Working Hours</h2>
            <ul>
              <li>Mon - Fri: 09:00 AM - 09:00 PM</li>
              <li>Saturday: 09:00 AM - 07:00 PM</li>
              <li>Sunday: 09:00 AM - 05:00 PM</li>
            </ul>
          </Col>
          <Col lg={6} xl={3}>
            <h2>Contact Us</h2>
            <ContactInfo />
          </Col>
        </Row>
        <Row>
          <p className="footer_text">{footer}</p>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
