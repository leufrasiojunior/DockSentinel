import * as React from "react";
import * as ReactDOM from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("Dialog components must be used within <Dialog>");
  return ctx;
}

interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, defaultOpen = false, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = open ?? internalOpen;

  function setOpen(nextOpen: boolean) {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  return <DialogContext.Provider value={{ open: isOpen, setOpen }}>{children}</DialogContext.Provider>;
}

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ asChild = false, children, ...props }, ref) => {
    const { setOpen } = useDialogContext();

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>;
      return React.cloneElement(child, {
        ...child.props,
        onClick: (event: React.MouseEvent) => {
          child.props.onClick?.(event);
          setOpen(true);
        },
      });
    }

    return (
      <button ref={ref} type="button" onClick={() => setOpen(true)} {...props}>
        {children}
      </button>
    );
  },
);

DialogTrigger.displayName = "DialogTrigger";

function DialogPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return ReactDOM.createPortal(children, document.body);
}

function DialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm", className)}
      {...props}
    />
  );
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  hideClose?: boolean;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, hideClose = false, ...props }, ref) => {
    const { t } = useTranslation();
    const { open, setOpen } = useDialogContext();
    if (!open) return null;

    return (
      <DialogPortal>
        <DialogOverlay onClick={() => setOpen(false)} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative w-full max-w-2xl rounded-[2rem] border border-border/60 bg-card/95 text-card-foreground shadow-[0_40px_120px_-50px_rgba(8,13,24,0.7)] backdrop-blur-xl",
              className,
            )}
            {...props}
          >
            {!hideClose ? (
              <button
                type="button"
                className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setOpen(false)}
                aria-label={t("common.actions.close")}
              >
                <X className="size-4" />
              </button>
            ) : null}
            {children}
          </div>
        </div>
      </DialogPortal>
    );
  },
);

DialogContent.displayName = "DialogContent";

const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2 px-6 pt-6", className)} {...props} />
  ),
);

DialogHeader.displayName = "DialogHeader";

const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col-reverse gap-2 border-t border-border/60 px-6 py-5 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  ),
);

DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-xl font-semibold tracking-tight text-foreground", className)} {...props} />
  ),
);

DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />
  ),
);

DialogDescription.displayName = "DialogDescription";

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ asChild = false, children, ...props }, ref) => {
    const { setOpen } = useDialogContext();

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>;
      return React.cloneElement(child, {
        ...child.props,
        onClick: (event: React.MouseEvent) => {
          child.props.onClick?.(event);
          setOpen(false);
        },
      });
    }

    return (
      <button ref={ref} type="button" onClick={() => setOpen(false)} {...props}>
        {children}
      </button>
    );
  },
);

DialogClose.displayName = "DialogClose";

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
