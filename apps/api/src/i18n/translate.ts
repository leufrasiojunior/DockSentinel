import { messages } from "./messages"
import { DEFAULT_LOCALE, getCurrentLocale, type AppLocale } from "./locale"

type TranslationParams = Record<string, string | number | boolean | null | undefined>

function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = params[key]
    return value === undefined || value === null ? "" : String(value)
  })
}

export function t(key: string, params?: TranslationParams, locale?: AppLocale) {
  const activeLocale = locale ?? getCurrentLocale() ?? DEFAULT_LOCALE
  const template =
    messages[activeLocale][key] ??
    messages[DEFAULT_LOCALE][key] ??
    key

  return interpolate(template, params)
}
