import React, { createContext, useContext, useMemo, useState } from "react";

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

function tone(kind: ToastKind) {
  if (kind === "success") return "border-green-200 bg-green-50 text-green-800";
  if (kind === "error") return "border-red-200 bg-red-50 text-red-800";
  return "border-gray-200 bg-white text-gray-800";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function remove(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function push(t: Omit<Toast, "id">) {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { ...t, id }]);

    // auto dismiss
    setTimeout(() => remove(id), 4500);
  }

  const api = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message, title) => push({ kind: "success", message, title }),
      error: (message, title) => push({ kind: "error", message, title }),
      info: (message, title) => push({ kind: "info", message, title }),
    }),
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast stack */}
      <div className="fixed right-4 top-4 z-[9999] w-full max-w-sm space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "rounded-xl border px-4 py-3 shadow-sm",
              tone(t.kind),
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                {t.title && <div className="text-sm font-semibold">{t.title}</div>}
                <div className="mt-0.5 text-sm">{t.message}</div>
              </div>

              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-800"
                onClick={() => remove(t.id)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
          </div>
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
