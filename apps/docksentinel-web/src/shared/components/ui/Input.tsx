import * as React from "react";

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm",
        "placeholder:text-gray-400",
        "focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300",
        className,
      ].join(" ")}
    />
  );
}
