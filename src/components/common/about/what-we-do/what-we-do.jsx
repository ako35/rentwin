import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { GiCarKey, GiJeep, GiAirplaneDeparture, GiTimeSynchronization } from "react-icons/gi";
import { TbBuildingSkyscraper } from "react-icons/tb";
import { RiVipDiamondLine } from "react-icons/ri";
import "./what-we-do.scss";

const serviceIcons = [
  <GiCarKey key="0" />,
  <TbBuildingSkyscraper key="1" />,
  <GiTimeSynchronization key="2" />,
  <RiVipDiamondLine key="3" />,
  <GiAirplaneDeparture key="4" />,
  <GiJeep key="5" />,
];

const WhatWeDo = () => {
  const { t } = useTranslation("home");
  const { desc, services, title } = t("whatWeDo", { returnObjects: true });

  return (
    <Container className="what-we-do">
      <div className="what-we-do__panel">
        <div className="what-we-do__media">
          <img src="/img/what_we_do.jpg" alt={title} loading="lazy" decoding="async" />
        </div>

        <div className="what-we-do__content">
          <h2 className="what-we-do__title">{title}</h2>
          <p className="what-we-do__desc">{desc}</p>

          <ul className="what-we-do__services">
            {services.map((item, index) => (
              <li className="what-we-do__service" key={item.id}>
                <span className="what-we-do__service-icon">{serviceIcons[index]}</span>
                <span className="what-we-do__service-title">{item.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  );
};

export default WhatWeDo;
