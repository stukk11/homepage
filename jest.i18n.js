import i18n from "i18next";
import { initReactI18next, setI18n } from "react-i18next";
import rawTranslationEN from "./public/locales/en/common.json";
import i18nConfig from "./next-i18next.config.js";

const translationEN = {
  common: rawTranslationEN,
};

// Set up formatter service
i18n.services = i18n.services || {};
i18n.services.formatter = {
  add: (name, fn) => {
    i18n.formatters = i18n.formatters || {};
    i18n.formatters[name] = fn;
  },
  format: (value, format, lng, options) => {
    return i18n.formatters?.[format]?.(value, lng, options) ?? value;
  },
};

// Register custom formatters
i18nConfig.use[0].init(i18n);

// Initialize i18n
i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  debug: false,
  initImmediate: false, // make sure init is synchronous in tests
  interpolation: {
    escapeValue: false,
    format: (value, format, lng, options) => i18n.services.formatter.format(value, format, lng, options),
  },
  resources: {
    en: translationEN,
  },
  ns: ["common"],
  defaultNS: "common",
  returnNull: false,
});

setI18n(i18n);

export default i18n;
