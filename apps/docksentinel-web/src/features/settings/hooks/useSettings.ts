import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../shared/components/ui/ToastProvider";
import { useConfirm } from "../../../shared/components/ui/ConfirmProvider";
import { getAuthStatus, logout, type AuthMode } from "../../auth/api/auth";
import {
  getSettings,
  testSmtp,
  updateSettings,
  type LogLevel,
  type NotificationLevel,
  type SmtpSecureMode,
  type UpdateSettingsBody,
} from "../api/settings";

export type SettingsTab = "auth" | "notifications";

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

export function useSettings() {
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<SettingsTab>("auth");

  const statusQuery = useQuery({
    queryKey: ["auth", "status"],
    queryFn: getAuthStatus,
  });

  const settingsQuery = useQuery({
    queryKey: ["settings", "safe"],
    queryFn: getSettings,
  });

  const currentMode = (statusQuery.data?.authMode ?? "none") as AuthMode;
  const safe = settingsQuery.data ?? null;

  const [desiredMode, setDesiredMode] = useState<AuthMode>(currentMode);
  const [logLevel, setLogLevel] = useState<LogLevel>("info");

  // Auth fields
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  // Notifications fields
  const [notificationsInAppEnabled, setNotificationsInAppEnabled] = useState(true);
  const [notificationsEmailEnabled, setNotificationsEmailEnabled] = useState(false);
  const [notificationLevel, setNotificationLevel] = useState<NotificationLevel>("all");
  const [notificationReadRetentionDays, setNotificationReadRetentionDays] = useState("15");
  const [notificationUnreadRetentionDays, setNotificationUnreadRetentionDays] = useState("60");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecureMode, setSmtpSecureMode] = useState<SmtpSecureMode>("starttls");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("DockSentinel");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");

  useEffect(() => {
    if (!statusQuery.data) return;
    setDesiredMode((statusQuery.data.authMode ?? "none") as AuthMode);
  }, [statusQuery.data]);

  useEffect(() => {
    if (!safe) return;
    setLogLevel((safe.logLevel as LogLevel) ?? "info");
    setNotificationsInAppEnabled(safe.notificationsInAppEnabled ?? true);
    setNotificationsEmailEnabled(safe.notificationsEmailEnabled ?? false);
    setNotificationLevel((safe.notificationLevel as NotificationLevel) ?? "all");
    setNotificationReadRetentionDays(String(safe.notificationReadRetentionDays ?? 15));
    setNotificationUnreadRetentionDays(String(safe.notificationUnreadRetentionDays ?? 60));
    setSmtpHost(safe.smtpHost ?? "");
    setSmtpPort(String(safe.smtpPort ?? 587));
    setSmtpSecureMode((safe.smtpSecureMode as SmtpSecureMode) ?? "starttls");
    setSmtpUsername(safe.smtpUsername ?? "");
    setSmtpFromName(safe.smtpFromName ?? "DockSentinel");
    setSmtpFromEmail(safe.smtpFromEmail ?? "");
  }, [safe]);

  const saveMutation = useMutation({
    mutationFn: async (options?: { totpConfirmedOverride?: boolean; customBody?: UpdateSettingsBody }) => {
      const body: UpdateSettingsBody = options?.customBody ?? { authMode: desiredMode, logLevel };
      
      if (!options?.customBody) {
        body.notificationsInAppEnabled = notificationsInAppEnabled;
        body.notificationsEmailEnabled = notificationsEmailEnabled;
        body.notificationLevel = notificationLevel;
        body.notificationReadRetentionDays = Number(notificationReadRetentionDays);
        body.notificationUnreadRetentionDays = Number(notificationUnreadRetentionDays);
        body.smtpHost = smtpHost.trim();
        body.smtpPort = Number(smtpPort);
        body.smtpSecureMode = smtpSecureMode;
        body.smtpUsername = smtpUsername.trim();
        body.smtpFromName = smtpFromName.trim() || "DockSentinel";
        body.smtpFromEmail = smtpFromEmail.trim();
        body.notificationRecipientEmail = smtpFromEmail.trim();
        if (smtpPassword.trim().length > 0) body.smtpPassword = smtpPassword;

        const wantPassword = desiredMode === "password" || desiredMode === "both";
        const hasPassword = safe?.hasPassword ?? false;
        const isChangingPassword = newPassword.length > 0 || newPassword2.length > 0;

        if (wantPassword) {
          if (isChangingPassword) {
            if (newPassword !== newPassword2) throw new Error("As senhas não conferem.");
            if (newPassword.length < 8) throw new Error("Senha precisa ter pelo menos 8 caracteres.");
            body.adminPassword = newPassword;
          } else if (!hasPassword) {
            throw new Error("Defina uma senha (mínimo 8 caracteres) para este modo.");
          }
        }
      }

      return updateSettings(body);
    },
    onSuccess: async () => {
      toast.success("Configurações salvas.", "Settings");
      setSmtpPassword("");
      setNewPassword("");
      setNewPassword2("");
      await qc.invalidateQueries({ queryKey: ["settings", "safe"] });
      await qc.invalidateQueries({ queryKey: ["auth", "status"] });

      if (desiredMode === "password" || (currentMode === "none" && desiredMode !== "none")) {
         try { await logout(); } catch { /* ok */ }
         qc.removeQueries({ queryKey: ["auth", "me"] });
         nav("/login", { replace: true });
      }
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Erro ao salvar"), "Settings"),
  });

  const smtpTestMutation = useMutation({
    mutationFn: async () =>
      testSmtp({
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort),
        smtpSecureMode,
        smtpUsername: smtpUsername.trim(),
        smtpPassword: smtpPassword.trim() || undefined,
        smtpFromName: smtpFromName.trim() || "DockSentinel",
        smtpFromEmail: smtpFromEmail.trim(),
      }),
    onSuccess: () => toast.success("SMTP validado com sucesso.", "SMTP"),
    onError: (error: unknown) => toast.error(errorMessage(error, "Falha no teste SMTP"), "SMTP"),
  });

  return {
    activeTab,
    setActiveTab,
    statusQuery,
    settingsQuery,
    currentMode,
    safe,
    desiredMode,
    setDesiredMode,
    logLevel,
    setLogLevel,
    newPassword,
    setNewPassword,
    newPassword2,
    setNewPassword2,
    notificationsInAppEnabled,
    setNotificationsInAppEnabled,
    notificationsEmailEnabled,
    setNotificationsEmailEnabled,
    notificationLevel,
    setNotificationLevel,
    notificationReadRetentionDays,
    setNotificationReadRetentionDays,
    notificationUnreadRetentionDays,
    setNotificationUnreadRetentionDays,
    smtpHost,
    setSmtpHost,
    smtpPort,
    setSmtpPort,
    smtpSecureMode,
    setSmtpSecureMode,
    smtpUsername,
    setSmtpUsername,
    smtpPassword,
    setSmtpPassword,
    smtpFromName,
    setSmtpFromName,
    smtpFromEmail,
    setSmtpFromEmail,
    saveMutation,
    smtpTestMutation,
  };
}
