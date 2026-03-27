import { Boxes, LockKeyhole, Mail, ShieldAlert } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { EmptyState } from "../../components/product/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { AuthSettings } from "../../features/settings/components/AuthSettings";
import { NotificationSettings } from "../../features/settings/components/NotificationSettings";
import { useSettings } from "../../features/settings/hooks/useSettings";
import { useConfirm } from "../../shared/components/ui/ConfirmProvider";
import { EnvironmentsPage } from "../Environments/EnvironmentsPage";

type SettingsTab = "auth" | "notifications" | "environments";

export function SettingsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();
  const {
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
    defaultLocale,
    setDefaultLocale,
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
    environmentHealthcheckIntervalMin,
    setEnvironmentHealthcheckIntervalMin,
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
  } = useSettings();

  const activeTab = useMemo<SettingsTab>(() => {
    if (location.pathname.startsWith("/settings/environments")) return "environments";
    if (location.pathname.startsWith("/settings/notifications")) return "notifications";
    return "auth";
  }, [location.pathname]);

  function handleTabChange(value: string) {
    const nextTab = value as SettingsTab;
    if (nextTab === "auth") {
      navigate("/settings");
      return;
    }
    navigate(`/settings/${nextTab}`);
  }

  function buildChangeConfirmText() {
    if (currentMode === "none") {
      return t("settings.authChangeText.none");
    }
    if (currentMode === "password") {
      return t("settings.authChangeText.password");
    }
    if (currentMode === "totp") {
      return t("settings.authChangeText.totp");
    }
    return t("settings.authChangeText.both");
  }

  async function handleSaveAuth(options?: { totpConfirmedOverride?: boolean }) {
    const isModeChange = desiredMode !== currentMode;
    if (isModeChange) {
      const ok = await confirm.confirm({
        title: t("settings.confirmAuthChangeTitle"),
        description:
          buildChangeConfirmText() +
          `\n\n${t("settings.confirmAuthChangeHint")}`,
        confirmText: t("common.actions.continue"),
        cancelText: t("common.actions.cancel"),
      });
      if (!ok) return;
    }

    saveMutation.mutate(options);
  }

  const loading = statusQuery.isLoading || settingsQuery.isLoading;
  const hasError = statusQuery.isError || settingsQuery.isError;

  return (
    <div className="space-y-6">
      {loading ? (
        <EmptyState
          title={t("settings.loadingTitle")}
          description={t("settings.loadingDescription")}
          icon={ShieldAlert}
        />
      ) : null}

      {hasError ? (
        <EmptyState
          title={t("settings.errorTitle")}
          description={t("settings.errorDescription")}
          icon={ShieldAlert}
        />
      ) : null}

      {safe ? (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="auth">
              <LockKeyhole className="size-4" />
              {t("settings.tabs.auth")}
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Mail className="size-4" />
              {t("settings.tabs.notifications")}
            </TabsTrigger>
            <TabsTrigger value="environments">
              <Boxes className="size-4" />
              {t("settings.tabs.environments")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auth">
            <AuthSettings
              safe={safe}
              currentMode={currentMode}
              desiredMode={desiredMode}
              setDesiredMode={setDesiredMode}
              logLevel={logLevel}
              setLogLevel={setLogLevel}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              newPassword2={newPassword2}
              setNewPassword2={setNewPassword2}
              onSave={handleSaveAuth}
              isSaving={saveMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings
              safe={safe}
              notificationsInAppEnabled={notificationsInAppEnabled}
              setNotificationsInAppEnabled={setNotificationsInAppEnabled}
              notificationsEmailEnabled={notificationsEmailEnabled}
              setNotificationsEmailEnabled={setNotificationsEmailEnabled}
              notificationLevel={notificationLevel}
              setNotificationLevel={setNotificationLevel}
              notificationReadRetentionDays={notificationReadRetentionDays}
              setNotificationReadRetentionDays={setNotificationReadRetentionDays}
              notificationUnreadRetentionDays={notificationUnreadRetentionDays}
              setNotificationUnreadRetentionDays={setNotificationUnreadRetentionDays}
              environmentHealthcheckIntervalMin={environmentHealthcheckIntervalMin}
              setEnvironmentHealthcheckIntervalMin={setEnvironmentHealthcheckIntervalMin}
              smtpHost={smtpHost}
              setSmtpHost={setSmtpHost}
              smtpPort={smtpPort}
              setSmtpPort={setSmtpPort}
              smtpSecureMode={smtpSecureMode}
              setSmtpSecureMode={setSmtpSecureMode}
              smtpUsername={smtpUsername}
              setSmtpUsername={setSmtpUsername}
              smtpPassword={smtpPassword}
              setSmtpPassword={setSmtpPassword}
              smtpFromName={smtpFromName}
              setSmtpFromName={setSmtpFromName}
              smtpFromEmail={smtpFromEmail}
              setSmtpFromEmail={setSmtpFromEmail}
              defaultLocale={defaultLocale}
              setDefaultLocale={setDefaultLocale}
              onSave={() => saveMutation.mutate(undefined)}
              isSaving={saveMutation.isPending}
              onTestSmtp={() => smtpTestMutation.mutate(undefined)}
              isTestingSmtp={smtpTestMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="environments">
            <EnvironmentsPage />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
