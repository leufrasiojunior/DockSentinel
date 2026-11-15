import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  contentClassName?: string;
}

function SectionCard({
  className,
  title,
  description,
  actions,
  contentClassName,
  children,
  ...props
}: SectionCardProps) {
  return (
    <Card className={cn("overflow-hidden rounded-3xl border border-white/8 bg-card/90 shadow-xl backdrop-blur-xl", className)} {...props}>
      <CardHeader className="border-b border-white/8 p-6">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg font-bold tracking-tight text-white">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-xs text-muted-foreground/80">{description}</CardDescription>
            ) : null}
          </div>
          {actions ? (
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={cn("p-6 space-y-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

export { SectionCard };
