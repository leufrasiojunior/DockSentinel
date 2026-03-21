/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ToastCard } from "../../../components/ui/toast";
import { cn } from "../../lib/utils/cn";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: string;
  kind: ToastKind;
  title?: string;
  message: string;
};

type ToastContextValue = {
  push: (t: Omit<Toast, "id">) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function meta(kind: ToastKind, t: (key: string) => string) {
  if (kind === "success") {
    return { variant: "success" as const, icon: CheckCircle2, label: t("toast.success") };
  }
  if (kind === "error") {
    return { variant: "error" as const, icon: AlertCircle, label: t("toast.error") };
  }
  return { variant: "info" as const, icon: Info, label: t("toast.info") };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const tr = useCallback((key: string) => t(key as never) as string, [t]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => remove(id), 4500);
  }, [remove]);

  const api = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message, title) => push({ kind: "success", message, title }),
      error: (message, title) => push({ kind: "error", message, title }),
      info: (message, title) => push({ kind: "info", message, title }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="fixed right-4 top-4 z-[9999] w-full max-w-sm space-y-3">
        {toasts.map((toastItem) => (
          <ToastCard key={toastItem.id} variant={meta(toastItem.kind, tr).variant}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl border border-current/10 bg-current/8 p-2">
                {React.createElement(meta(toastItem.kind, tr).icon, { className: "size-4" })}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {toastItem.title ? <div className="text-sm font-semibold">{toastItem.title}</div> : null}
                  <div className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] opacity-70">
                    {meta(toastItem.kind, tr).label}
                  </div>
                </div>
                <div className="mt-1 text-sm leading-relaxed opacity-90">{toastItem.message}</div>
              </div>

              <button
                type="button"
                className={cn(
                  "rounded-full p-1 text-current/60 transition-colors hover:bg-current/10 hover:text-current",
                )}
                onClick={() => remove(toastItem.id)}
                aria-label={t("toast.close")}
              >
                <X className="size-4" />
              </button>
            </div>
          </ToastCard>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
