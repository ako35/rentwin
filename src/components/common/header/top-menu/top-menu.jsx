import { Container } from "react-bootstrap";
import { BsGeoAlt } from "react-icons/bs";
import { constants } from "../../../../constants";
import "./top-menu.scss";

const {
  website: { email, phone, legalAddress, mapUrl },
} = constants;

// Thin light strip above the main header row: contact details + address.
const TopMenu = () => (
  <div className="top-bar">
    <Container className="top-bar__inner">
      <div className="top-bar__contact">
        <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
        <span className="top-bar__sep" />
        <a href={`mailto:${email}`}>{email}</a>
      </div>
      <a
        className="top-bar__address"
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <BsGeoAlt /> {legalAddress}
      </a>
    </Container>
  </div>
);

export default TopMenu;
