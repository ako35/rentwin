import { Spacer, Slider, ReservationSearch, PopularVehicles, BestOffers, Team, WhatWeDo } from '../../../components'
import './style.scss'

const HomePage = () => {
  return (
    <>
      <div className="home-hero">
        <Slider />
        <ReservationSearch />
      </div>
      <Spacer />
      <PopularVehicles />
      <Spacer />
      <BestOffers />
      <Spacer />
      <Team />
      <Spacer />
      <WhatWeDo />
    </>
  )
}

export default HomePage
