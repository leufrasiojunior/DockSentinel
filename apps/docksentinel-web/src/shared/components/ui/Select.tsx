import * as React from "react";

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300",
        className,
      ].join(" ")}
    >
      {children}
    </select>
  );
}
