import * as React from "react";

import { cn } from "@/lib/utils";

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
}

function FormField({ className, label, description, error, children, ...props }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description ? <div className="text-sm leading-relaxed text-muted-foreground">{description}</div> : null}
      </div>
      {children}
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </div>
  );
}

export { FormField };
