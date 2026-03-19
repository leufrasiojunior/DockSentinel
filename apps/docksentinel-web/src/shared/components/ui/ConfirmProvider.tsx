/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";

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
        <AlertDialog open onOpenChange={(open) => (!open ? close(false) : undefined)}>
          <AlertDialogContent className="max-w-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{pending.opts.title}</AlertDialogTitle>
              {pending.opts.description ? (
                <AlertDialogDescription className="whitespace-pre-wrap">
                  {pending.opts.description}
                </AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button" onClick={() => close(false)}>
                {pending.opts.cancelText ?? "Cancelar"}
              </AlertDialogCancel>
              <AlertDialogAction
                type="button"
                variant={pending.opts.danger ? "danger" : "primary"}
                onClick={() => close(true)}
              >
                {pending.opts.confirmText ?? "Confirmar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
