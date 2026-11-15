import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { socialNetworks } from "../social-icons/networks";
import "./follow-us.scss";

// Homepage band with one large, tappable tile per social profile — the
// header and footer icons are easy to miss. Lists whatever is filled in
// constants `website.social`; renders nothing while none is.
const FollowUs = () => {
  const { t } = useTranslation("home");
  if (socialNetworks.length === 0) return null;

  return (
    <Container as="section" className="follow-us" aria-labelledby="follow-us-title">
      <div className="follow-us__panel">
        <h2 id="follow-us-title" className="follow-us__title">
          {t("followUs.title")}
        </h2>
        <p className="follow-us__desc">{t("followUs.desc")}</p>

        <ul className="follow-us__list">
          {socialNetworks.map(({ key, name, Icon, href, handle }) => (
            <li key={key}>
              <a
                className={`follow-us__tile follow-us__tile--${key}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="follow-us__icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="follow-us__text">
                  <span className="follow-us__name">{name}</span>
                  <span className="follow-us__handle">{handle}</span>
                </span>
                <span className="follow-us__action">{t(`followUs.actions.${key}`)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
};

export default FollowUs;
