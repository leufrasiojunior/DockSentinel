export const SUPPORTED_LOCALES = ["pt-BR", "en-US", "es-ES"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt-BR";
export const LOCALE_STORAGE_KEY = "locale";

export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== "string") return DEFAULT_LOCALE;

  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("pt")) return "pt-BR";
  if (normalized.startsWith("en")) return "en-US";
  if (normalized.startsWith("es")) return "es-ES";
  return DEFAULT_LOCALE;
}

export function getBrowserLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const preferred = window.navigator.languages?.[0] ?? window.navigator.language;
  return normalizeLocale(preferred);
}

export function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;

  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return saved ? normalizeLocale(saved) : null;
}

export function getInitialLocale(): Locale {
  return getStoredLocale() ?? getBrowserLocale();
}
