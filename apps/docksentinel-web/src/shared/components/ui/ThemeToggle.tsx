import { MoonStar, SunMedium } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={toggleTheme}
      className="rounded-full border-border/70 bg-card/75 text-muted-foreground hover:bg-accent/70 hover:text-foreground"
      title={theme === "light" ? t("theme.toggleToDark") : t("theme.toggleToLight")}
    >
      {theme === "light" ? (
        <MoonStar className="size-4.5 transition-all" />
      ) : (
        <SunMedium className="size-4.5 transition-all" />
      )}
      <span className="sr-only">{t("theme.toggle")}</span>
    </Button>
  );
}
