import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type Locale, SUPPORTED_LOCALES } from "../../../i18n/locale";
import { getLocaleLabel } from "../../../i18n/helpers";
import { Select } from "../../../components/ui/select";
import { useLocale } from "./LocaleProvider";
import { useTheme } from "./ThemeProvider";

export function LanguageSelector() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const { theme } = useTheme();

  return (
    <div className="flex items-center overflow-hidden rounded-full border border-border/70 bg-card/75 text-muted-foreground shadow-sm transition-colors hover:bg-accent/70 hover:text-foreground focus-within:border-border focus-within:bg-accent/70 focus-within:text-foreground">
      <div
        className="flex size-8 items-center justify-center border-r border-border/50"
        title={t("navigation.language")}
        aria-hidden="true"
      >
        <Languages className="size-4" />
      </div>
      <Select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="h-8 min-w-[11rem] rounded-none border-0 bg-transparent px-3 py-1 pr-9 text-xs font-medium text-foreground shadow-none focus-visible:ring-0"
        aria-label={t("navigation.language")}
        style={{ colorScheme: theme }}
      >
        {SUPPORTED_LOCALES.map((supportedLocale) => (
          <option
            key={supportedLocale}
            value={supportedLocale}
            style={{
              backgroundColor: "var(--color-popover)",
              color: "var(--color-popover-foreground)",
            }}
          >
            {getLocaleLabel(t, supportedLocale)}
          </option>
        ))}
      </Select>
    </div>
  );
}
