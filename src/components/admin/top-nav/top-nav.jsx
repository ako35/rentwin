import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { Container, Form, Nav, NavDropdown, Navbar } from "react-bootstrap";
import { AiOutlineHome } from "react-icons/ai";
import { utils } from "../../../utils";
import { logout } from "../../../store";
import { services } from "../../../services";
import { constants } from "../../../constants";
import { LanguageSwitcher } from "../../";
import "./top-nav.scss";

const { routes } = constants;

const MODULE_OPTIONS = [
  { key: "vehicle", route: routes.adminVehicles },
  { key: "reservationsAndContracts", route: routes.adminReservations },
  { key: "customer", route: routes.adminUsers },
  { key: "location", route: routes.adminLocations },
];

const AdminTopNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation("admin");

  const handleLogout = () => {
    utils.functions
      .swalQuestion(t("topNav.logoutConfirmTitle"), t("topNav.logoutConfirmText"))
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(logout());
          services.encryptedLocalStorage.removeItem("rentwintoken");
        }
        navigate(routes.home);
      });
  };

  const comingSoon = (module) => () => navigate(`${routes.adminComingSoon}/${module}`);

  return (
    <Navbar expand="lg" className="admin-top-nav" data-bs-theme="dark">
      <Container fluid>
        <Link to={routes.adminDashboard} className="admin-top-nav__home" title={t("topNav.home")}>
          <AiOutlineHome />
        </Link>
        <Link to={routes.adminDashboard} className="admin-top-nav__brand">
          RENT<span>WIN</span>
        </Link>
        <Navbar.Toggle aria-controls="admin-top-nav-collapse" />
        <Navbar.Collapse id="admin-top-nav-collapse">
          <Nav className="admin-top-nav__menu">
            <NavDropdown
              title={t("topNav.vehicle")}
              active={pathname.startsWith(routes.adminVehicles)}
            >
              <NavDropdown.Item as={Link} to={routes.adminVehicles}>{t("topNav.vehicleList")}</NavDropdown.Item>
              <NavDropdown.Item as={Link} to={`${routes.adminVehicles}/new`}>{t("topNav.addVehicle")}</NavDropdown.Item>
            </NavDropdown>
            <Nav.Link as={Link} to={routes.adminReservations} active={pathname.startsWith(routes.adminReservations)}>
              {t("topNav.reservationsAndContracts")}
            </Nav.Link>
            <Nav.Link as={Link} to={routes.adminUsers} active={pathname.startsWith(routes.adminUsers)}>
              {t("topNav.customer")}
            </Nav.Link>
            <NavDropdown title={t("topNav.price")} active={pathname.startsWith(routes.adminExtras)}>
              <NavDropdown.Item as={Link} to={routes.adminExtras}>{t("topNav.extras")}</NavDropdown.Item>
            </NavDropdown>
            <Nav.Link as={Link} to={routes.adminLocations} active={pathname.startsWith(routes.adminLocations)}>
              {t("topNav.location")}
            </Nav.Link>
            <Nav.Link onClick={comingSoon("finans")}>{t("topNav.finance")}</Nav.Link>
            <NavDropdown title={t("topNav.system")} active={pathname.startsWith(routes.adminAnnouncements)}>
              <NavDropdown.Item as={Link} to={routes.adminAnnouncements}>{t("topNav.announcements")}</NavDropdown.Item>
              <NavDropdown.Item as={Link} to={routes.home}>{t("topNav.backToWebsite")}</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>{t("topNav.logout")}</NavDropdown.Item>
            </NavDropdown>
            <Nav.Link onClick={comingSoon("rapor")}>{t("topNav.report")}</Nav.Link>
          </Nav>
          <div className="admin-top-nav__right">
            <Form.Control
              type="search"
              size="sm"
              placeholder={t("topNav.quickAccessPlaceholder")}
              className="admin-top-nav__search"
            />
            <Form.Select
              size="sm"
              className="admin-top-nav__module-select"
              aria-label={t("topNav.moduleSwitcherLabel")}
              defaultValue={routes.adminVehicles}
              onChange={(e) => navigate(e.target.value)}
            >
              {MODULE_OPTIONS.map((item) => (
                <option key={item.key} value={item.route}>
                  {t(`topNav.${item.key}`)}
                </option>
              ))}
            </Form.Select>
            <LanguageSwitcher />
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AdminTopNav;
