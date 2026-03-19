import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive" | "info";
}

function StatCard({
  className,
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
  ...props
}: StatCardProps) {
  return (
    <Card className={cn("p-5", className)} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <div className="text-3xl font-semibold tracking-tight text-foreground">{value}</div>
          {helper ? <div className="text-sm leading-relaxed text-muted-foreground">{helper}</div> : null}
        </div>
        {Icon ? (
          <div className="rounded-2xl border border-border/60 bg-muted/45 p-3">
            <Icon className="size-5 text-foreground" />
          </div>
        ) : null}
      </div>
      <div className="mt-4">
        <Badge variant={tone}>Live</Badge>
      </div>
    </Card>
  );
}

export { StatCard };
