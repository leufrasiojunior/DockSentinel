import i18n from "./index";
import { DEFAULT_LOCALE, type Locale, normalizeLocale } from "./locale";

function getLocale(locale?: Locale): Locale {
  if (locale) return locale;
  const active = i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LOCALE;
  return normalizeLocale(active);
}

export function getCurrentLocale(): Locale {
  return getLocale();
}

export function formatDateTime(
  value: string | number | Date | null | undefined,
  locale?: Locale,
  options?: Intl.DateTimeFormatOptions,
) {
  if (value == null || value === "") return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(getLocale(locale), {
    dateStyle: "short",
    timeStyle: "short",
    ...options,
  }).format(date);
}

export function formatNumber(value: number, locale?: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(getLocale(locale), options).format(value);
}

export function formatList(values: string[], locale?: Locale, options?: Intl.ListFormatOptions) {
  return new Intl.ListFormat(getLocale(locale), {
    style: "long",
    type: "conjunction",
    ...options,
  }).format(values);
}
