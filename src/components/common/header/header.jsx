import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { AppLink, TopMenu, BottomMenu } from "../../";
import "./header.scss";

const Header = () => {
  const { t } = useTranslation("header");

  return (
    <header className="site-header fixed-top">
      <TopMenu />
      <div className="site-header__bar">
        <Container className="p-0 site-header__row">
          <AppLink to="/" title={t("goToHomepage")} className="site-header__brand">
            <span className="site-header__logo">
              RENT<span>WIN</span>
            </span>
            <span className="site-header__tagline">{t("slogan")}</span>
          </AppLink>
          <BottomMenu />
        </Container>
      </div>
    </header>
  );
};

export default Header;
