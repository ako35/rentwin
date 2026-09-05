import { useTranslation } from "react-i18next"
import { BestOffers, PageHeader, Spacer, Team, WhatWeDo, WhoWeAre } from "../../../components"
import { usePageMeta } from "../../../hooks/use-page-meta"

const AboutPage = () => {
  const { t } = useTranslation("about");
  usePageMeta(t("seoTitle"), t("seoDescription"));
  return (
    <>
      <PageHeader title={t("pageTitle")} />
      <Spacer />
      <WhoWeAre />
      <Spacer />
      <BestOffers />
      <Spacer />
      <Team />
      <Spacer />
      <WhatWeDo />
    </>
  )
}

export default AboutPage