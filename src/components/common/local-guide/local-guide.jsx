import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { constants } from "../../../constants";
import AppLink from "../app-link/app-link";
import "./local-guide.scss";

// Homepage "Aliağa'da Araç Kiralama" block: the homepage is the page Google
// ranks (and the Google Business Profile links to) for "aliağa araç kiralama",
// so it carries real local copy plus descriptive links to the pages that
// cover each sub-topic. Copy lives in home.json `localGuide`; the bot
// prerender renders the same keys (backend/src/lib/seo-ld.js renderHomeBody).
const LINK_TARGETS = {
  ...constants.routes,
  aliagaOffice: `${constants.routes.locations}/aliaga`,
  airport: `${constants.routes.locations}/izmir-havalimani`,
};

const LocalGuide = () => {
  const { t } = useTranslation("home");
  const { title, paragraphs, linksTitle, links } = t("localGuide", { returnObjects: true });

  return (
    <Container as="section" className="local-guide" aria-labelledby="local-guide-title">
      <div className="local-guide__copy">
        <h2 id="local-guide-title" className="local-guide__title">{title}</h2>
        {paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
      <nav className="local-guide__links" aria-labelledby="local-guide-links-title">
        <h3 id="local-guide-links-title" className="local-guide__links-title">{linksTitle}</h3>
        <ul>
          {links
            .filter((link) => LINK_TARGETS[link.route])
            .map((link) => (
              <li key={link.route}>
                <AppLink to={LINK_TARGETS[link.route]}>{link.label}</AppLink>
              </li>
            ))}
        </ul>
      </nav>
    </Container>
  );
};

export default LocalGuide;
