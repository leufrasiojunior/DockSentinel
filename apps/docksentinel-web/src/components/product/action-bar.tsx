import * as React from "react";

import { cn } from "@/lib/utils";

function ActionBar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 p-3 ",
        className,
      )}
      {...props}
    />
  );
}

export { ActionBar };
