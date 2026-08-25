import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
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

const beforeVehiclesItems = [
  {
    title: "Dashboard",
    icon: <MdOutlineDashboard />,
    pathname: `${routes.adminDashboard}`,
  },
  {
    title: "Users",
    icon: <FaUsers />,
    pathname: `${routes.adminUsers}`,
  },
];

const afterVehiclesItems = [
  {
    title: "Reservations",
    icon: <MdBookOnline />,
    pathname: `${routes.adminReservations}`,
  },
  {
    title: "Contact Messages",
    icon: <MdOutlineSpeakerNotes />,
    pathname: `${routes.adminContactMessages}`,
  },
];

const renderNavLink = (item, pathname) => (
  <Nav.Link
    key={item.title}
    as={Link}
    to={item.pathname}
    active={
      item.title === "Dashboard"
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

  const handleLogout = () => {
    utils.functions
      .swalQuestion("Logout", "Are you sure you want to logout?")
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
                <p>YOUR RELIABLE RIDE, AS LONG AS YOU NEED</p>
              </div>
            </div>
          </Link>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="admin-panel" />
        <Navbar.Collapse id="admin-panel">
          <Nav className="mt-5">
            {beforeVehiclesItems.map((item) => renderNavLink(item, pathname))}
            <NavDropdown
              title={
                <>
                  <GiMechanicGarage /> Vehicles
                </>
              }
              active={pathname.startsWith(routes.adminVehicles)}
              id="vehicles-nav-dropdown"
            >
              <NavDropdown.Item as={Link} to={`${routes.adminVehicles}/new`}>
                Add Vehicle
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to={routes.adminVehicles}>
                Vehicle List
              </NavDropdown.Item>
            </NavDropdown>
            {afterVehiclesItems.map((item) => renderNavLink(item, pathname))}
            <Nav.Link as={Link} to={routes.home}>
              <MdWeb /> Back To Website
            </Nav.Link>
            <Nav.Link onClick={handleLogout}>
              <MdOutlineLogout /> Logout
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Sidebar;
