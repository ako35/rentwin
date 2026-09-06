import { Col, Container, Row } from "react-bootstrap";
import { ContactForm, ContactInfo, ContactMap, JsonLd, PageHeader, Spacer } from "../../../components/";
import { useTranslation } from "react-i18next";
import { usePageMeta } from "../../../hooks/use-page-meta";
import { breadcrumbLd } from "../../../utils/seo";
import './style.scss'

const ContactPage = () => {
  const { t } = useTranslation("contact");
  const { t: tCommon } = useTranslation("common");
  usePageMeta(t("seoTitle"), t("seoDescription"));
  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbLd([
          { name: tCommon("nav.home"), path: "/" },
          { name: t("pageTitle") },
        ])}
      />
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