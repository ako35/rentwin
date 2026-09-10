import { useTranslation } from 'react-i18next'
import { Spacer, HomeHero, PopularVehicles, CampaignsSection, BestOffers, Team, WhatWeDo, JsonLd } from '../../../components'
import { usePageMeta } from '../../../hooks/use-page-meta'
import { webSiteLd } from '../../../utils/seo'

const HomePage = () => {
  const { t } = useTranslation('home')
  usePageMeta({
    title: t('seo.title'),
    description: t('seo.description'),
    canonical: 'https://rentwin.com.tr/',
  })

  return (
    <>
      <JsonLd id="ld-website" data={webSiteLd()} />
      <HomeHero />
      <Spacer />
      <PopularVehicles />
      <Spacer />
      <CampaignsSection />
      <BestOffers />
      <Spacer />
      <Team />
      <Spacer />
      <WhatWeDo />
      <Spacer />
    </>
  )
}

export default HomePage
