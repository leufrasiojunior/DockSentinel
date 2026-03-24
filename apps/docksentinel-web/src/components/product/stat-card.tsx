import * as React from "react";
import {  type LucideIcon } from "lucide-react";

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
    
    <Card className={cn("relative p-1", className)} {...props}>
      {Icon ? (
        <div className="absolute left-5 top-5">
          <Icon className="size-5 text-foreground bg-" />
        </div>
      ) : null}
      <div className="flex min-h-20 items-center justify-center">
        <div className="min-w-0 space-y-3 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <div className="text-3xl font-semibold tracking-tight text-foreground">{value}</div>
        </div>
      </div>
    </Card>
  );
}

export { StatCard };
