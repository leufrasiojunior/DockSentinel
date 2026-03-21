import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES } from "../../../i18n/locale";
import { getLocaleLabel } from "../../../i18n/helpers";
import { useLocale } from "./LocaleProvider";
import { cn } from "../../lib/utils/cn";
import { LocaleFlag } from "./LocaleFlag";

export function LanguageSelector() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={t("navigation.language")}
        aria-label={t("navigation.language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex items-center gap-1.5 overflow-hidden rounded-full border border-border/70 bg-card/75 px-2 py-1 text-muted-foreground shadow-sm transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 sm:gap-2 sm:px-2.5",
          open && "border-border bg-accent/70 text-foreground",
        )}
      >
        <LocaleFlag locale={locale} className="size-4 shrink-0 sm:size-4.5" />
        <span className="max-w-17 truncate text-[11px] font-medium leading-none text-foreground sm:max-w-none sm:text-xs">
          {getLocaleLabel(t, locale)}
        </span>
        <ChevronDown className={cn("size-3.5 shrink-0 transition-transform sm:size-4", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={t("navigation.language")}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-44 rounded-2xl border border-border/70 bg-popover/95 p-1.5 text-popover-foreground shadow-xl backdrop-blur-xl"
        >
          {SUPPORTED_LOCALES.map((supportedLocale) => {
            const isActive = supportedLocale === locale;

            return (
              <button
                key={supportedLocale}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setLocale(supportedLocale);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-popover-foreground hover:bg-accent/70 hover:text-accent-foreground",
                )}
              >
                <LocaleFlag locale={supportedLocale} className="size-[1.05rem] shrink-0" />
                <span className="min-w-0 flex-1 truncate">{getLocaleLabel(t, supportedLocale)}</span>
                {isActive ? <Check className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
