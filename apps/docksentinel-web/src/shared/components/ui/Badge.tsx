import * as React from "react";
import { cn } from "../../lib/utils/cn";

type Tone = "gray" | "green" | "yellow" | "red" | "blue";

export function Badge({
  children,
  tone = "gray",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const tones: Record<Tone, string> = {
    green: "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400 dark:border-green-500/30",
    yellow: "bg-yellow-500/10 text-yellow-800 border-yellow-500/20 dark:text-yellow-500 dark:border-yellow-500/30",
    red: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400 dark:border-red-500/30",
    blue: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
    gray: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
