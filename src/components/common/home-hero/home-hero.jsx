import { Link } from "react-router-dom";
import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { BsArrowRight, BsCheck2Circle } from "react-icons/bs";
import { constants } from "../../../constants";
import { ReservationSearch } from "../../";
import FleetCar from "./fleet-car";
import "./home-hero.scss";

const { routes } = constants;

const HomeHero = () => {
  const { t } = useTranslation("home");
  const trust = t("hero.trust", { returnObjects: true });

  return (
    <section className="home-hero">
      <Container className="home-hero__inner">
        <div className="home-hero__split">
          <div className="home-hero__copy">
            <span className="home-hero__eyebrow">{t("hero.eyebrow")}</span>
            <h1 className="home-hero__title">{t("hero.title")}</h1>
            <p className="home-hero__lead">{t("hero.lead")}</p>

            <ul className="home-hero__trust">
              {(Array.isArray(trust) ? trust : []).map((item) => (
                <li key={item}>
                  <BsCheck2Circle /> {item}
                </li>
              ))}
            </ul>

            <Link to={routes.vehicles} className="home-hero__browse">
              {t("hero.browseCta")} <BsArrowRight />
            </Link>
          </div>

          <div className="home-hero__visual">
            <FleetCar />
          </div>
        </div>

        <ReservationSearch />
      </Container>
    </section>
  );
};

export default HomeHero;
