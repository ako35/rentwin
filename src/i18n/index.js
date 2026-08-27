import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import trCommon from "./locales/tr/common.json";
import trHeader from "./locales/tr/header.json";
import trFooter from "./locales/tr/footer.json";
import trHome from "./locales/tr/home.json";
import trAbout from "./locales/tr/about.json";
import trContact from "./locales/tr/contact.json";
import trAuth from "./locales/tr/auth.json";
import trVehicles from "./locales/tr/vehicles.json";
import trUser from "./locales/tr/user.json";
import trAdmin from "./locales/tr/admin.json";
import trErrors from "./locales/tr/errors.json";
import trValidation from "./locales/tr/validation.json";

import enCommon from "./locales/en/common.json";
import enHeader from "./locales/en/header.json";
import enFooter from "./locales/en/footer.json";
import enHome from "./locales/en/home.json";
import enAbout from "./locales/en/about.json";
import enContact from "./locales/en/contact.json";
import enAuth from "./locales/en/auth.json";
import enVehicles from "./locales/en/vehicles.json";
import enUser from "./locales/en/user.json";
import enAdmin from "./locales/en/admin.json";
import enErrors from "./locales/en/errors.json";
import enValidation from "./locales/en/validation.json";

const resources = {
  tr: {
    common: trCommon,
    header: trHeader,
    footer: trFooter,
    home: trHome,
    about: trAbout,
    contact: trContact,
    auth: trAuth,
    vehicles: trVehicles,
    user: trUser,
    admin: trAdmin,
    errors: trErrors,
    validation: trValidation,
  },
  en: {
    common: enCommon,
    header: enHeader,
    footer: enFooter,
    home: enHome,
    about: enAbout,
    contact: enContact,
    auth: enAuth,
    vehicles: enVehicles,
    user: enUser,
    admin: enAdmin,
    errors: enErrors,
    validation: enValidation,
  },
};

const syncDocumentLanguage = (lng) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
};

i18n.on("languageChanged", syncDocumentLanguage);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "tr",
    supportedLngs: ["tr", "en"],
    ns: [
      "common",
      "header",
      "footer",
      "home",
      "about",
      "contact",
      "auth",
      "vehicles",
      "user",
      "admin",
      "errors",
      "validation",
    ],
    defaultNS: "common",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "rentwinLanguage",
    },
    interpolation: {
      escapeValue: false,
    },
  })
  .then(() => {
    syncDocumentLanguage(i18n.resolvedLanguage);
  });

export default i18n;
