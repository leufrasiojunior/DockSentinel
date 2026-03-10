import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./Button";

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    // Check for saved theme in localStorage
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) return savedTheme;
      
      // Check for system preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => prev === "light" ? "dark" : "light");
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-9 w-9 p-0 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      title={theme === "light" ? "Mudar para modo escuro" : "Mudar para modo claro"}
    >
      {theme === "light" ? (
        <Moon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
