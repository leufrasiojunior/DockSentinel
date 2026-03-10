import * as React from "react";
import { cn } from "../../lib/utils/cn";

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
        className,
      )}
    >
      {children}
    </select>
  );
}
