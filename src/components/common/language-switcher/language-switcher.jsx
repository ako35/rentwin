import { useTranslation } from "react-i18next";
import { Dropdown } from "react-bootstrap";
import { BsGlobe } from "react-icons/bs";
import "./language-switcher.scss";

const languages = [
  { code: "tr", labelKey: "language.tr" },
  { code: "en", labelKey: "language.en" },
];

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation("common");

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
  };

  return (
    <Dropdown align="end" className="language-switcher">
      <Dropdown.Toggle variant="outline-secondary" size="sm">
        <BsGlobe /> {i18n.resolvedLanguage?.toUpperCase()}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {languages.map((lang) => (
          <Dropdown.Item
            key={lang.code}
            active={i18n.resolvedLanguage === lang.code}
            onClick={() => changeLanguage(lang.code)}
          >
            {t(lang.labelKey)}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LanguageSwitcher;
