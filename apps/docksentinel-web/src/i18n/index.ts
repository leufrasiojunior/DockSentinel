import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, getInitialLocale, normalizeLocale } from "./locale";
import { resources } from "./resources";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: getInitialLocale(),
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: ["pt-BR", "pt", "en-US", "en"],
    nonExplicitSupportedLngs: true,
    load: "currentOnly",
    resources,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false,
    },
  })
  .then(() => {
    const nextLocale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language);
    if (nextLocale !== i18n.resolvedLanguage) {
      void i18n.changeLanguage(nextLocale);
    }
  });

export default i18n;
