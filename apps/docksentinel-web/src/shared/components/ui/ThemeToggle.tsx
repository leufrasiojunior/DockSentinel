import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "./Button";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={toggleTheme}
      className="rounded-full border-border/70 bg-card/75 text-muted-foreground hover:bg-accent/70 hover:text-foreground"
      title={theme === "light" ? "Mudar para modo escuro" : "Mudar para modo claro"}
    >
      {theme === "light" ? (
        <MoonStar className="size-4.5 transition-all" />
      ) : (
        <SunMedium className="size-4.5 transition-all" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
