import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-md border border-input bg-background text-primary-foreground shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className,
      )}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    >
      <Check className={cn("size-3.5 transition-opacity", checked ? "opacity-100" : "opacity-0")} />
    </button>
  ),
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
