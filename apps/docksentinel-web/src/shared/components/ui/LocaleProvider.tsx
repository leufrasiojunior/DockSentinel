/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale, normalizeLocale } from "../../../i18n/locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [locale, setLocaleState] = useState<Locale>(() =>
    normalizeLocale(i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LOCALE),
  );

  useEffect(() => {
    function syncLocale(nextLanguage: string) {
      const nextLocale = normalizeLocale(nextLanguage);
      setLocaleState(nextLocale);
      document.documentElement.lang = nextLocale;
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);

      if (nextLanguage !== nextLocale && i18n.resolvedLanguage !== nextLocale) {
        void i18n.changeLanguage(nextLocale);
      }
    }

    syncLocale(i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LOCALE);
    i18n.on("languageChanged", syncLocale);
    return () => {
      i18n.off("languageChanged", syncLocale);
    };
  }, [i18n]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        setLocaleState(nextLocale);
        void i18n.changeLanguage(nextLocale);
      },
    }),
    [i18n, locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}
