/* eslint-disable react-refresh/only-export-components */
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toastVariants = cva(
  "rounded-[1.6rem] border px-4 py-4 shadow-[0_22px_50px_-36px_rgba(8,13,24,0.6)] backdrop-blur-xl",
  {
    variants: {
      variant: {
        success: "border-emerald-500/25 bg-emerald-500/12 text-emerald-950 dark:text-emerald-100",
        error: "border-rose-500/25 bg-rose-500/12 text-rose-950 dark:text-rose-100",
        info: "border-border/70 bg-card/90 text-card-foreground",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

function ToastCard({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof toastVariants>) {
  return <div className={cn(toastVariants({ variant }), className)} {...props} />;
}

export { ToastCard, toastVariants };
