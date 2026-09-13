import { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dropdown } from "react-bootstrap";
import { BsGlobe } from "react-icons/bs";
import { LocaleContext } from "../../../hooks/use-locale";
import { localizePath, stripLocalePrefix } from "../../../i18n/locale-routing";
import "./language-switcher.scss";

// Must match i18n/index.js's detection.lookupLocalStorage.
const LANGUAGE_STORAGE_KEY = "rentwinLanguage";

const languages = [
  { code: "tr", labelKey: "language.tr" },
  { code: "en", labelKey: "language.en" },
];

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  // Non-null only inside CommonLayout's URL-locale-routed marketing tree.
  // There, language is a fact of the URL — switching means navigating to the
  // /en-prefixed (or unprefixed) twin of the current page, not mutating
  // global i18n state. Everywhere else (admin/auth/user) it's the old
  // toggle: call changeLanguage and persist the choice ourselves (i18n's own
  // auto-cache is off so the two modes can't clobber each other's language).
  const routedLocale = useContext(LocaleContext);
  const activeCode = routedLocale || i18n.resolvedLanguage;

  const select = (code) => {
    if (routedLocale) {
      const canonicalPath = stripLocalePrefix(location.pathname);
      navigate(`${localizePath(canonicalPath, code)}${location.search}`);
      return;
    }
    i18n.changeLanguage(code);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // Private-browsing / storage-blocked — the toggle still works for
      // this visit, it just won't be remembered next time.
    }
  };

  return (
    <Dropdown align="end" className="language-switcher">
      <Dropdown.Toggle variant="outline-secondary" size="sm">
        <BsGlobe /> {activeCode?.toUpperCase()}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {languages.map((lang) => (
          <Dropdown.Item
            key={lang.code}
            active={activeCode === lang.code}
            onClick={() => select(lang.code)}
          >
            {t(lang.labelKey)}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LanguageSwitcher;
