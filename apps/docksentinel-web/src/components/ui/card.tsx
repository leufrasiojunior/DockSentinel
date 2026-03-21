import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-3xl border border-border/60 bg-card/85 text-card-foreground shadow-[0_20px_80px_-40px_rgba(12,18,28,0.45)] backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = "Card";

type LegacyCardHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
};

const CardHeader = React.forwardRef<HTMLDivElement, LegacyCardHeaderProps>(
  ({ className, title, subtitle, right, children, ...props }, ref) => {
    const hasLegacyProps = title !== undefined || subtitle !== undefined || right !== undefined;

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-3 border-b border-border/60 px-6 py-5 sm:flex-row sm:items-start sm:justify-between",
          className,
        )}
        {...props}
      >
        {hasLegacyProps ? (
          <>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-[0.02em] text-foreground">{title}</div>
              {subtitle ? (
                <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</div>
              ) : null}
            </div>
            {right ? <div className="shrink-0">{right}</div> : null}
          </>
        ) : (
          children
        )}
      </div>
    );
  },
);

CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-base font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  ),
);

CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  ),
);

CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 py-5", className)} {...props} />
  ),
);

CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-3 border-t border-border/60 px-6 py-4", className)}
      {...props}
    />
  ),
);

CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
