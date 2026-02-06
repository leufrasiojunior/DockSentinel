import React, { createContext, useContext, useMemo, useState } from "react";
import { Button } from "./Button";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type Pending = {
  opts: ConfirmOptions;
  resolve: (v: boolean) => void;
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  function confirm(opts: ConfirmOptions) {
    return new Promise<boolean>((resolve) => {
      setPending({ opts, resolve });
    });
  }

  function close(result: boolean) {
    const p = pending;
    setPending(null);
    p?.resolve(result);
  }

  const api = useMemo<ConfirmContextValue>(() => ({ confirm }), []);

  return (
    <ConfirmContext.Provider value={api}>
      {children}

      {pending && (
        <div className="fixed inset-0 z-[9998]">
          <div className="absolute inset-0 bg-black/40" onClick={() => close(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border bg-white shadow-xl">
              <div className="p-5">
                <div className="text-lg font-semibold text-gray-900">
                  {pending.opts.title}
                </div>
                {pending.opts.description && (
                  <div className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                    {pending.opts.description}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t p-4">
                <Button type="button" onClick={() => close(false)}>
                  {pending.opts.cancelText ?? "Cancelar"}
                </Button>

                <Button
                  type="button"
                  variant={pending.opts.danger ? "danger" : "primary"}
                  onClick={() => close(true)}
                >
                  {pending.opts.confirmText ?? "Confirmar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
