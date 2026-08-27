import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { utils } from "../../../utils";
import { logout } from "../../../store";
import { services } from "../../../services";
import { constants } from "../../../constants";
import { Container, Nav, NavDropdown, Navbar } from "react-bootstrap";
import {
  MdBookOnline,
  MdOutlineDashboard,
  MdOutlineLogout,
  MdOutlineSpeakerNotes,
  MdWeb,
} from "react-icons/md";
import { FaUsers } from "react-icons/fa";
import { GiMechanicGarage } from "react-icons/gi";
import "./sidebar.scss";

const { routes } = constants;

const renderNavLink = (item, pathname, isDashboard) => (
  <Nav.Link
    key={item.key}
    as={Link}
    to={item.pathname}
    active={
      isDashboard
        ? pathname === item.pathname
        : pathname.startsWith(item.pathname)
    }
  >
    {item.icon} {item.title}
  </Nav.Link>
);

const Sidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation("admin");
  const { t: tHeader } = useTranslation("header");

  const beforeVehiclesItems = [
    {
      key: "dashboard",
      title: t("sidebar.dashboard"),
      icon: <MdOutlineDashboard />,
      pathname: `${routes.adminDashboard}`,
    },
    {
      key: "users",
      title: t("sidebar.users"),
      icon: <FaUsers />,
      pathname: `${routes.adminUsers}`,
    },
  ];

  const afterVehiclesItems = [
    {
      key: "reservations",
      title: t("sidebar.reservations"),
      icon: <MdBookOnline />,
      pathname: `${routes.adminReservations}`,
    },
    {
      key: "contactMessages",
      title: t("sidebar.contactMessages"),
      icon: <MdOutlineSpeakerNotes />,
      pathname: `${routes.adminContactMessages}`,
    },
  ];

  const handleLogout = () => {
    utils.functions
      .swalQuestion(t("sidebar.logoutConfirmTitle"), t("sidebar.logoutConfirmText"))
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(logout());
          services.encryptedLocalStorage.removeItem("rentwintoken");
        }
        navigate(`${routes.home}`);
      });
  };

  return (
    <Navbar expand="lg" className="admin-sidebar" data-bs-theme="dark">
      <Container>
        <Navbar.Brand>
          <Link to={routes.home}>
            <div className="logo">
              <div className="logo_text">
                RENT<span>WIN</span>
                <p>{tHeader("slogan")}</p>
              </div>
            </div>
          </Link>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="admin-panel" />
        <Navbar.Collapse id="admin-panel">
          <Nav className="mt-5">
            {beforeVehiclesItems.map((item) => renderNavLink(item, pathname, item.key === "dashboard"))}
            <NavDropdown
              title={
                <>
                  <GiMechanicGarage /> {t("sidebar.vehicles")}
                </>
              }
              active={pathname.startsWith(routes.adminVehicles)}
              id="vehicles-nav-dropdown"
            >
              <NavDropdown.Item as={Link} to={`${routes.adminVehicles}/new`}>
                {t("sidebar.addVehicle")}
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to={routes.adminVehicles}>
                {t("sidebar.vehicleList")}
              </NavDropdown.Item>
            </NavDropdown>
            {afterVehiclesItems.map((item) => renderNavLink(item, pathname, false))}
            <Nav.Link as={Link} to={routes.home}>
              <MdWeb /> {t("sidebar.backToWebsite")}
            </Nav.Link>
            <Nav.Link onClick={handleLogout}>
              <MdOutlineLogout /> {t("sidebar.logout")}
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Sidebar;
