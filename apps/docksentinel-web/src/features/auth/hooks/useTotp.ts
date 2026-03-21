import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../shared/components/ui/ToastProvider";
import { totpInit, totpConfirm, type TotpInitResponse } from "../api/totp";

export function useTotp() {
  const { t } = useTranslation();
  const toast = useToast();
  const [totp, setTotp] = useState<TotpInitResponse | null>(null);
  const [totpToken, setTotpToken] = useState("");
  const [totpConfirmed, setTotpConfirmed] = useState(false);
  const [totpNow, setTotpNow] = useState(() => Date.now());

  useEffect(() => {
    if (!totp || totpConfirmed) return;
    const t = window.setInterval(() => setTotpNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [totp, totpConfirmed]);

  const totpExpiresInSec = useMemo(() => {
    if (!totp?.expiresAt) return null;
    const ms = Date.parse(totp.expiresAt) - totpNow;
    return Math.max(0, Math.ceil(ms / 1000));
  }, [totp?.expiresAt, totpNow]);

  const initMutation = useMutation({
    mutationFn: () => totpInit({ label: "DockSentinel" }),
    onSuccess: (resp) => {
      setTotp(resp);
      setTotpToken("");
      setTotpConfirmed(false);
      toast.info(t("settings.auth.initSuccess"), "TOTP");
    },
    onError: (error: any) => toast.error(error?.message ?? t("settings.auth.initError"), "TOTP"),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!totp) throw new Error(t("settings.auth.initRequired"));
      return totpConfirm({ challengeId: totp.challengeId, token: totpToken });
    },
    onSuccess: (resp) => {
      if (resp.ok) {
        setTotpConfirmed(true);
        toast.success(t("settings.auth.confirmSuccess", { authMode: resp.authMode }), "TOTP");
      } else {
        toast.error(t("settings.auth.confirmUnexpected"), "TOTP");
      }
    },
    onError: (error: any) => toast.error(error?.message ?? t("settings.auth.confirmError"), "TOTP"),
  });

  return {
    totp,
    setTotp,
    totpToken,
    setTotpToken,
    totpConfirmed,
    setTotpConfirmed,
    totpExpiresInSec,
    initMutation,
    confirmMutation,
  };
}
