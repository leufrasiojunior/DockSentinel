import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: string;
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
        "lg:items-center flex flex-col gap-5 rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_18px_60px_-40px_rgba(8,13,24,0.55)] backdrop-blur-sm lg:flex-row lg:justify-between ",
        className,
      )}
      {...props}
    >
      <div className="space-y-3">
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
      {actions ? <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">{actions}</div> : null}
    </div>
  );
}

export { PageHeader };
