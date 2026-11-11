import { useTranslation } from "react-i18next"
import { Container } from "react-bootstrap"
import { AppLink, JsonLd, PageHeader, Spacer, Vehicles } from "../../../components"
import { constants } from "../../../constants"
import { usePageMeta } from "../../../hooks/use-page-meta"
import { breadcrumbLd } from "../../../utils/seo"
import "./style.scss"

const VehiclesPage = () => {
  const { t } = useTranslation("vehicles");
  const { t: tCommon } = useTranslation("common");
  usePageMeta(t("seoTitle"), t("seoDescription"));

  const seoBody = t("seoBody", { returnObjects: true });
  const paragraphs = Array.isArray(seoBody?.paragraphs) ? seoBody.paragraphs : [];

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
      <Container className="vehicles-page__intro">
        <p>{t("seoIntro")}</p>
      </Container>
      <Vehicles />
      <Spacer />
      {paragraphs.length > 0 && (
        <Container as="section" className="vehicles-page__about">
          <h2>{seoBody.title}</h2>
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <p className="vehicles-page__see-also">
            {seoBody.seeAlso}{" "}
            <AppLink to={constants.routes.commercialRental}>{tCommon("nav.commercialRental")}</AppLink>
            {" · "}
            <AppLink to={constants.routes.longTermRental}>{tCommon("nav.longTermRental")}</AppLink>
          </p>
        </Container>
      )}
      <Spacer />
    </>
  )
}

export default VehiclesPage
