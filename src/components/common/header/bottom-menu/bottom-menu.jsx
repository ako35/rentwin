import { Container, Nav, Navbar } from "react-bootstrap"
import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { constants } from "../../../../constants"
import { UserMenu, LanguageSwitcher } from '../../../'
import './bottom-menu.scss'

const {
  routes: { home, vehicles, locations, about, contact },
} = constants;

const navigationLinks = [
  { direct: home, key: "home" },
  { direct: vehicles, key: "vehicles" },
  { direct: locations, key: "locations" },
  { direct: about, key: "about" },
  { direct: contact, key: "contact" },
];

const BottomMenu = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation("common");
  return (
    <div className="bottom-menu">
      <Navbar expand='lg'>
        <Container className="p-0">
          <Navbar.Toggle aria-controls="toggle" />
          <Navbar.Collapse id="toggle">
            <Nav className="me-auto">
              {
                navigationLinks.map(item => (
                  <Nav.Link key={item.key} as={Link} to={item.direct} active={pathname === item.direct}>
                    {t(`nav.${item.key}`)}
                  </Nav.Link>
                ))
              }
            </Nav>
            <LanguageSwitcher />
            <UserMenu />
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </div>
  )
}

export default BottomMenu
