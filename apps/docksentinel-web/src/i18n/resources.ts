import { translationEnUs } from "./locales/en-US";
import { translationPtBr } from "./locales/pt-BR";

const baseResources = {
  "pt-BR": {
    translation: translationPtBr,
  },
  "en-US": {
    translation: translationEnUs,
  },
} as const;

export const resources = {
  ...baseResources,
  pt: baseResources["pt-BR"],
  en: baseResources["en-US"],
} as const;

export type TranslationSchema = typeof translationEnUs;
