import * as React from "react";
import { cn } from "../../lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  const sizes =
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-3 py-2 text-sm";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800",
    danger: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100 border border-transparent dark:text-gray-300 dark:hover:bg-white/10",
    secondary: "bg-white text-gray-800 hover:bg-gray-50 border border-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-700 dark:hover:bg-slate-700"
  };

  return (
    <button
      {...props}
      className={cn(base, sizes, variants[variant], className)}
    />
  );
}
