import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { BsGeoAlt } from "react-icons/bs";
import { constants } from "../../../../constants";
import { socialNetworks } from "../../social-icons/networks";
import "./top-menu.scss";

const {
  website: { email, phone, legalAddress, mapUrl },
} = constants;

// Thin strip above the main header row: contact details on the left,
// address and the social profile icons on the right.
const TopMenu = () => {
  const { t } = useTranslation("footer");

  return (
    <div className="top-bar">
      <Container className="top-bar__inner">
        <div className="top-bar__contact">
          <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
          <span className="top-bar__sep top-bar__sep--email" />
          <a className="top-bar__email" href={`mailto:${email}`}>{email}</a>
        </div>
        <div className="top-bar__right">
          <a
            className="top-bar__address"
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BsGeoAlt /> {legalAddress}
          </a>
          {socialNetworks.length > 0 && (
            <>
              <span className="top-bar__sep top-bar__sep--address" />
              <ul className="top-bar__social">
                {socialNetworks.map(({ key, name, Icon, href }) => (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("socialLabel", { network: name })}
                      title={name}
                    >
                      <Icon />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Container>
    </div>
  );
};

export default TopMenu;
