import * as React from "react";

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
    "inline-flex items-center justify-center rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes =
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-3 py-2 text-sm";

  const variants =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-700"
        : variant === "ghost"
          ? "bg-transparent text-gray-700 hover:bg-gray-100 border border-transparent"
          : "bg-white text-gray-800 hover:bg-gray-50 border border-gray-200";

  return (
    <button
      {...props}
      className={[base, sizes, variants, className].join(" ")}
    />
  );
}
