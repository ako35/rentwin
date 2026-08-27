import { Col, Container, Row } from "react-bootstrap";
import { ContactForm, ContactInfo, ContactMap, PageHeader, Spacer } from "../../../components/";
import { useTranslation } from "react-i18next";
import './style.scss'

const ContactPage = () => {
  const { t } = useTranslation("contact");
  return (
    <>
      <PageHeader title={t("pageTitle")}/>
      <Spacer />
      <Container>
        <Row>
          <Col md={6} className="contact-info-container">
            <p>{t("desc")}</p>
            <Spacer />
            <ContactInfo />
          </Col>
          <Col md={6}>
            <ContactForm />
          </Col>
        </Row>
      </Container>
      <Spacer />
      <ContactMap />
    </>
  )
}

export default ContactPage