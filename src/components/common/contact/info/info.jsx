import { useTranslation } from "react-i18next";
import { BiHeadphone } from "react-icons/bi";
import { MdEmail } from "react-icons/md";
import { HiLocationMarker } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { constants } from "../../../../constants";
import "./info.scss";

const {
  website: { address, email, phone, phoneE164, mapUrl, whatsapp },
} = constants;

const buildItems = (t) => [
  { key: "phone", icon: <BiHeadphone />, label: t("info.phone"), value: phone, href: `tel:${phoneE164}` },
  { key: "email", icon: <MdEmail />, label: t("info.email"), value: email, href: `mailto:${email}` },
  {
    key: "address",
    icon: <HiLocationMarker />,
    label: t("info.address"),
    value: address,
    href: mapUrl,
    external: true,
  },
];

// variant="cards" (default): icon tiles + a WhatsApp CTA, for the contact page.
// variant="plain": a simple themed list, for the footer.
const ContactInfo = ({ variant = "cards" }) => {
  const { t } = useTranslation("contact");
  const items = buildItems(t);
  const linkProps = (item) =>
    item.external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  if (variant === "plain") {
    return (
      <ul className="contact-info contact-info--plain">
        {items.map((item) => (
          <li key={item.key}>
            <a href={item.href} {...linkProps(item)}>
              {item.icon}
              <span>{item.value}</span>
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="contact-info">
      <ul className="contact-info__cards">
        {items.map((item) => (
          <li key={item.key}>
            <a href={item.href} className="contact-info__card" {...linkProps(item)}>
              <span className="contact-info__icon">{item.icon}</span>
              <span className="contact-info__body">
                <span className="contact-info__label">{item.label}</span>
                <span className="contact-info__value">{item.value}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="contact-info__whatsapp"
      >
        <FaWhatsapp />
        {t("info.whatsapp")}
      </a>
    </div>
  );
};

export default ContactInfo;
