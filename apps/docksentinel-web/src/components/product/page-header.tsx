import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

function PageHeader({
  className,
  title,
  description,
  eyebrow,
  actions,
  meta,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-3xl border border-white/8 bg-card/85 p-6 shadow-xl backdrop-blur-xl xl:flex-row xl:items-center xl:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1 space-y-3">
        {eyebrow ? (
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {typeof eyebrow === "string" ? <Badge variant="outline">{eyebrow}</Badge> : eyebrow}
          </div>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
          ) : null}
        </div>
        {meta ? <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3 xl:w-auto xl:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export { PageHeader };
