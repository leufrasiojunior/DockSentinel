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
  const toneStyles = {
    default: {
      iconBox: "border-violet-500/35 bg-violet-600/20 text-violet-300 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)]",
      badge: "border-violet-500/30 bg-violet-500/10 text-violet-300",
      badgeText: "LIVE DATA",
    },
    success: {
      iconBox: "border-emerald-500/35 bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)]",
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      badgeText: "ACTIVE",
    },
    info: {
      iconBox: "border-cyan-500/35 bg-cyan-500/20 text-cyan-300 shadow-[0_0_20px_-3px_rgba(6,182,212,0.3)]",
      badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
      badgeText: "READY",
    },
    warning: {
      iconBox: "border-amber-500/35 bg-amber-500/20 text-amber-300 shadow-[0_0_20px_-3px_rgba(245,158,11,0.3)]",
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
      badgeText: "ALERT",
    },
    destructive: {
      iconBox: "border-rose-500/35 bg-rose-500/20 text-rose-300 shadow-[0_0_20px_-3px_rgba(244,63,94,0.3)]",
      badge: "border-rose-500/30 bg-rose-500/10 text-rose-300",
      badgeText: "ERROR",
    },
  }[tone];

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/8 bg-card/90 p-5 shadow-lg backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        {Icon ? (
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl border p-2.5 transition-transform duration-200",
              toneStyles.iconBox,
            )}
          >
            <Icon className="size-5 shrink-0" />
          </div>
        ) : <div />}
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.16em]",
            toneStyles.badge,
          )}
        >
          {toneStyles.badgeText}
        </span>
      </div>

      <div className="mt-4 space-y-1">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
          {label}
        </div>
        <div className="text-3xl font-extrabold tracking-tight text-white font-sans">
          {value}
        </div>
      </div>

      {helper ? (
        <div className="mt-3 text-xs text-muted-foreground/75">{helper}</div>
      ) : null}
    </Card>
  );
}

export { StatCard };
