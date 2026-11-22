import { Col, Container, Row } from "react-bootstrap"
import {OfferItem, SectionHeader} from "../../../"
import { useTranslation } from "react-i18next"
import { MdBusinessCenter, MdDateRange } from "react-icons/md"
import { GiAirplaneArrival, GiCityCar, GiTruck } from "react-icons/gi"
import { PiVan } from "react-icons/pi"
import './best-offers.scss'

// Same order as home.json `offers`: daily car, monthly, panel van,
// double-cab pickup, airport delivery, company rentals.
const offerIcons = [
  <GiCityCar key={0} />,
  <MdDateRange key={1} />,
  <PiVan key={2} />,
  <GiTruck key={3} />,
  <GiAirplaneArrival key={4} />,
  <MdBusinessCenter key={5} />,
]

const BestOffers = () => {
  const { t } = useTranslation("home");
  const offers = t("offers", { returnObjects: true });

  return (
    <div className="best-offers">
      <SectionHeader title1={t("sections.bestOffers.title1")} title2={t("sections.bestOffers.title2")} />
      <div className="offers">
        <Container>
          <Row>
            <Col lg={4}>
              {
                offers.slice(0, 3).map((item, index) => (
                  <OfferItem key={item.title} icon={offerIcons[index]} {...item}/>
                ))
              }
            </Col>
            <Col lg={4}>
              <img src="/img/vertical_car.png" alt="" className="img-fluid" />
            </Col>
            <Col lg={4}>
              {
                offers.slice(3).map((item, index) => (
                  <OfferItem key={item.title} icon={offerIcons[index+3]} {...item}/>
                ))
              }
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  )
}

export default BestOffers