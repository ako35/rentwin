import { Col, Container, Row } from "react-bootstrap"
import {OfferItem, SectionHeader} from "../../../"
import { useTranslation } from "react-i18next"
import { MdFamilyRestroom, MdOutlineWorkspacePremium } from "react-icons/md"
import { GiEcology, GiCarWheel, GiModernCity, GiCircleForest,  } from "react-icons/gi"
import './best-offers.scss'

const offerIcons = [
  <GiModernCity key={0} />,
  <GiCircleForest key={1} />,
  <MdOutlineWorkspacePremium key={2} />,
  <MdFamilyRestroom key={3} />,
  <GiEcology key={4} />,
  <GiCarWheel key={5} />,
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