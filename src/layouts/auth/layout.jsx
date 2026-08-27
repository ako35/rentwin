import { Col, Container, Row } from "react-bootstrap"
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import { constants } from "../../constants"
import { GiCancel, GiHomeGarage } from "react-icons/gi"
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import './style.scss'
import { useEffect } from "react";

const { routes, website } = constants;

const AuthLayout = () => {
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const { t: tHeader } = useTranslation("header");

  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (Object.keys(user).length > 0) return <Navigate to={routes.home} />;

  return (
    <Container fluid className="auth-layout">
      <Row>
        <Col lg={6} className="banner">
          <img src="/logo.png" alt={website.name} title={website.name} />
          <div className="toolbar">
            <GiCancel title={t("layout.goBack")} onClick={() => navigate(-1)} />
            <GiHomeGarage title={t("layout.goHomePage")} onClick={() => navigate(routes.home)} />
          </div>
        </Col>
        <Link to={routes.home} className="logo">
          <div className="logo_text">
            RENT<span>WIN</span>
            <p>{tHeader("slogan")}</p>
          </div>
        </Link>
        <Col lg={6} className="forms">
          <Outlet />
        </Col>
      </Row>
    </Container>
  )
}

export default AuthLayout