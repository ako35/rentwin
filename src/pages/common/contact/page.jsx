import { Col, Container, Row } from "react-bootstrap";
import { ContactForm, ContactInfo, ContactMap, PageHeader, Spacer } from "../../../components/";
import { useTranslation } from "react-i18next";
import { usePageMeta } from "../../../hooks/use-page-meta";
import './style.scss'

const ContactPage = () => {
  const { t } = useTranslation("contact");
  usePageMeta(t("seoTitle"), t("seoDescription"));
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