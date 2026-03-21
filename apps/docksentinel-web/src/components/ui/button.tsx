/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent text-sm font-medium transition-all duration-200 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_12px_30px_-18px_color-mix(in_oklab,var(--color-primary)_85%,transparent)] hover:-translate-y-0.5 hover:bg-primary/92 hover:shadow-[0_18px_34px_-18px_color-mix(in_oklab,var(--color-primary)_92%,transparent)]",
        primary:
          "bg-primary text-primary-foreground shadow-[0_12px_30px_-18px_color-mix(in_oklab,var(--color-primary)_85%,transparent)] hover:-translate-y-0.5 hover:bg-primary/92 hover:shadow-[0_18px_34px_-18px_color-mix(in_oklab,var(--color-primary)_92%,transparent)]",
        secondary:
          "border-border/70 bg-card/85 text-foreground shadow-sm hover:-translate-y-0.5 hover:border-border hover:bg-card",
        outline:
          "border-border bg-background/70 text-foreground shadow-sm hover:-translate-y-0.5 hover:bg-accent/60 hover:text-accent-foreground",
        ghost:
          "text-muted-foreground hover:bg-accent/65 hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_10px_26px_-16px_color-mix(in_oklab,var(--color-destructive)_90%,transparent)] hover:-translate-y-0.5 hover:bg-destructive/92",
        danger:
          "bg-destructive text-destructive-foreground shadow-[0_10px_26px_-16px_color-mix(in_oklab,var(--color-destructive)_90%,transparent)] hover:-translate-y-0.5 hover:bg-destructive/92",
        link: "h-auto rounded-none px-0 py-0 text-primary underline-offset-4 hover:text-primary/80 hover:underline",
        subtle:
          "border-border/60 bg-muted/55 text-foreground hover:-translate-y-0.5 hover:bg-muted/80",
      },
      size: {
        default: "h-10 px-4 py-2",
        md: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 px-5 text-sm",
        xs: "h-7 rounded-lg px-2.5 text-[0.72rem]",
        icon: "size-10",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-slot="button"
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
