import { Container } from "react-bootstrap";
import { TopMenu, BottomMenu } from "../../";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./header.scss";

const Header = () => {
  const { t } = useTranslation("header");

  return (
    <Container className="p-0 fixed-top">
      <div className="header">
        <Link to="/" title={t("goToHomepage")}>
          <div className="logo">
            <div className="logo_text">
              RENT<span>WIN</span>
              <p>{t("slogan")}</p>
            </div>
          </div>
        </Link>
        <div className="menus">
          <TopMenu />
          <BottomMenu />
        </div>
      </div>
    </Container>
  );
};

export default Header;
