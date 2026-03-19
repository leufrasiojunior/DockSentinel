/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.72rem] font-medium tracking-[0.02em] whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/15 bg-primary/10 text-primary",
        outline: "border-border/70 bg-background/70 text-muted-foreground",
        secondary: "border-border/70 bg-muted/60 text-foreground",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        warning: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        destructive: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        info: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        neutral: "border-border/70 bg-muted/55 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type LegacyTone = "gray" | "green" | "yellow" | "red" | "blue";

function resolveVariant(variant?: BadgeProps["variant"], tone?: LegacyTone) {
  if (variant) return variant;
  if (tone === "green") return "success";
  if (tone === "yellow") return "warning";
  if (tone === "red") return "destructive";
  if (tone === "blue") return "info";
  return "neutral";
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  tone?: LegacyTone;
}

function Badge({ className, variant, tone, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant: resolveVariant(variant, tone) }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
