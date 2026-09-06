import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TopMenu, BottomMenu } from "../../";
import "./header.scss";

const Header = () => {
  const { t } = useTranslation("header");

  return (
    <header className="site-header fixed-top">
      <TopMenu />
      <div className="site-header__bar">
        <Container className="p-0 site-header__row">
          <Link to="/" title={t("goToHomepage")} className="site-header__brand">
            <span className="site-header__logo">
              RENT<span>WIN</span>
            </span>
            <span className="site-header__tagline">{t("slogan")}</span>
          </Link>
          <BottomMenu />
        </Container>
      </div>
    </header>
  );
};

export default Header;
