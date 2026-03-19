import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

function EmptyState({ className, title, description, icon: Icon, actions, ...props }: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed p-10", className)} {...props}>
      <div className="flex flex-col items-start gap-4">
        {Icon ? (
          <div className="rounded-2xl border border-border/60 bg-muted/45 p-3">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        ) : null}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description ? <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </Card>
  );
}

export { EmptyState };
