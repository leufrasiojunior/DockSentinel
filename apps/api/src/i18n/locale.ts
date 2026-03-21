import { AsyncLocalStorage } from "node:async_hooks"

export const SUPPORTED_LOCALES = ["pt-BR", "en-US"] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = "pt-BR"

const localeStorage = new AsyncLocalStorage<AppLocale>()

export function normalizeLocale(value: unknown): AppLocale | null {
  if (typeof value !== "string") return null

  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.startsWith("pt")) return "pt-BR"
  if (normalized.startsWith("en")) return "en-US"
  return null
}

export function resolveLocaleFromAcceptLanguage(
  value: unknown,
  fallback: AppLocale = DEFAULT_LOCALE,
): AppLocale {
  if (Array.isArray(value)) {
    for (const item of value) {
      const locale = resolveLocaleFromAcceptLanguage(item, fallback)
      if (locale) return locale
    }
    return fallback
  }

  if (typeof value !== "string") return fallback

  const candidates = value
    .split(",")
    .map((item) => item.split(";")[0]?.trim())
    .filter(Boolean)

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate)
    if (locale) return locale
  }

  return fallback
}

export function runWithLocale<T>(locale: AppLocale, callback: () => T): T {
  return localeStorage.run(locale, callback)
}

export function getCurrentLocale(): AppLocale | null {
  return localeStorage.getStore() ?? null
}
