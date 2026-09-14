import { Container, Nav, Navbar } from "react-bootstrap"
import { useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { constants } from "../../../../constants"
import { AppLink, UserMenu, LanguageSwitcher } from '../../../'
import { stripLocalePrefix } from "../../../../i18n/locale-routing"
import './bottom-menu.scss'

const {
  routes: { home, vehicles, campaigns, locations, blog, reviews, about, faq, contact },
} = constants;

const navigationLinks = [
  { direct: home, key: "home" },
  { direct: vehicles, key: "vehicles" },
  { direct: campaigns, key: "campaigns" },
  { direct: locations, key: "locations" },
  { direct: blog, key: "blog" },
  { direct: reviews, key: "reviews" },
  { direct: about, key: "about" },
  { direct: faq, key: "faq" },
  { direct: contact, key: "contact" },
];

const BottomMenu = () => {
  const { pathname } = useLocation();
  const canonicalPathname = stripLocalePrefix(pathname);
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
                  <Nav.Link key={item.key} as={AppLink} to={item.direct} active={canonicalPathname === item.direct}>
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
