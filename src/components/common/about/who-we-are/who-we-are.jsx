import { Col, Container, Row } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import "./who-we-are.scss";

const WhoWeAre = () => {
  const { t } = useTranslation("about");
  const desc = t("whoWeAre.desc", { returnObjects: true });
  return (
    <Container className="who-we-are">
      <Row>
        <Col lg={3}>
          <div className="img-col">
            <img src="/img/about_1.jpg" alt={t("pageTitle")} />
            <div className="border-left"></div>
            <div className="border-top"></div>
          </div>
        </Col>
        <Col lg={9} className="who-we-are-content">
          <div className="who-we-are-info">
            <h2>{t("pageTitle")}</h2>
            <p>{desc[0]}</p>
          </div>
        </Col>
        <Col lg={9} className="who-we-are-content">
          <p>{desc[1]}</p>
        </Col>
        <Col lg={3}>
          <div className="img-col">
            <img src="/img/about_2.jpg" alt={t("pageTitle")} className="right" />
            <div className="border-right"></div>
            <div className="border-bottom"></div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default WhoWeAre;
