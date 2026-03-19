import * as React from "react";

import { cn } from "@/lib/utils";

interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  helper?: React.ReactNode;
}

function FilterBar({ className, helper, children, ...props }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[1.4rem] border border-border/60 bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {helper ? <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{helper}</div> : null}
    </div>
  );
}

export { FilterBar };
