import { translationEnUs } from "./locales/en-US";
import { translationEsEs } from "./locales/es-ES";
import { translationPtBr } from "./locales/pt-BR";

const baseResources = {
  "pt-BR": {
    translation: translationPtBr,
  },
  "en-US": {
    translation: translationEnUs,
  },
  "es-ES": {
    translation: translationEsEs,
  },
} as const;

export const resources = {
  ...baseResources,
  pt: baseResources["pt-BR"],
  en: baseResources["en-US"],
  es: baseResources["es-ES"],
} as const;

export type TranslationSchema = typeof translationEnUs;
