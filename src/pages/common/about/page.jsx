import { useTranslation } from "react-i18next"
import { BestOffers, PageHeader, Spacer, Team, WhatWeDo, WhoWeAre } from "../../../components"

const AboutPage = () => {
  const { t } = useTranslation("about");
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