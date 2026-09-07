import { useTranslation } from "react-i18next"
import { BestOffers, JsonLd, PageHeader, Spacer, Team, WhatWeDo, WhoWeAre } from "../../../components"
import { usePageMeta } from "../../../hooks/use-page-meta"
import { breadcrumbLd } from "../../../utils/seo"

const AboutPage = () => {
  const { t } = useTranslation("about");
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
      <PageHeader title={t("pageTitle")} />
      <Spacer />
      <WhoWeAre />
      <Spacer />
      <BestOffers />
      <Spacer />
      <Team />
      <Spacer />
      <WhatWeDo />
      <Spacer />
    </>
  )
}

export default AboutPage