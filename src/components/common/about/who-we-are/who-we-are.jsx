import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { BsBullseye, BsEye } from "react-icons/bs";
import "./who-we-are.scss";

const WhoWeAre = () => {
  const { t } = useTranslation("about");
  const wwa = t("whoWeAre", { returnObjects: true });
  const { heading, desc = [], stats = [], mission, vision } = wwa;

  return (
    <Container className="who-we-are">
      <div className="who-we-are__intro">
        <div className="who-we-are__media">
          <img
            src="/img/vertical_car.png"
            alt={t("pageTitle")}
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="who-we-are__text">
          <h2 className="who-we-are__heading">{heading}</h2>
          {desc.map((para) => (
            <p key={para.slice(0, 24)}>{para}</p>
          ))}
        </div>
      </div>

      {stats.length > 0 && (
        <ul className="who-we-are__stats">
          {stats.map((s) => (
            <li className="who-we-are__stat" key={s.label}>
              <span className="who-we-are__stat-value">{s.value}</span>
              <span className="who-we-are__stat-label">{s.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="who-we-are__mv">
        <div className="who-we-are__mv-card">
          <span className="who-we-are__mv-icon">
            <BsBullseye />
          </span>
          <h3>{mission?.title}</h3>
          <p>{mission?.text}</p>
        </div>
        <div className="who-we-are__mv-card">
          <span className="who-we-are__mv-icon">
            <BsEye />
          </span>
          <h3>{vision?.title}</h3>
          <p>{vision?.text}</p>
        </div>
      </div>
    </Container>
  );
};

export default WhoWeAre;
