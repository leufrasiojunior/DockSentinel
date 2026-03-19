import { LockKeyhole, Mail, ShieldAlert } from "lucide-react";

import { EmptyState } from "../../components/product/empty-state";
import { PageHeader } from "../../components/product/page-header";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { AuthSettings } from "../../features/settings/components/AuthSettings";
import { NotificationSettings } from "../../features/settings/components/NotificationSettings";
import { useSettings } from "../../features/settings/hooks/useSettings";
import { useConfirm } from "../../shared/components/ui/ConfirmProvider";

export function SettingsPage() {
  const confirm = useConfirm();
  const {
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
  } = useSettings();

  function buildChangeConfirmText() {
    if (currentMode === "none") {
      return "Você está sem login ativo. Essa alteração pode exigir login novamente.";
    }
    if (currentMode === "password") {
      return "Seu login atual é por senha. Ao salvar, você pode ser deslogado e precisará entrar novamente.";
    }
    if (currentMode === "totp") {
      return "Seu login atual é por TOTP. Ao salvar, você pode ser deslogado e precisará entrar novamente com TOTP.";
    }
    return "Seu login atual é senha + TOTP. Ao salvar, você pode ser deslogado e precisará entrar novamente.";
  }

  async function handleSaveAuth(options?: { totpConfirmedOverride?: boolean }) {
    const isModeChange = desiredMode !== currentMode;
    if (isModeChange) {
      const ok = await confirm.confirm({
        title: "Confirmar alteração do modo de login?",
        description:
          buildChangeConfirmText() +
          "\n\nDica: se você perdeu o TOTP ou quer trocar a senha, pode manter o mesmo modo e apenas reconfigurar.",
        confirmText: "Continuar",
        cancelText: "Cancelar",
      });
      if (!ok) return;
    }

    saveMutation.mutate(options);
  }

  const loading = statusQuery.isLoading || settingsQuery.isLoading;
  const hasError = statusQuery.isError || settingsQuery.isError;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control"
        title="Workspace Settings"
        description="Autenticação, SMTP e retenção de notificações, organizados em uma linguagem única de configuração."
        meta={
          <>
            <Badge variant="outline">modo atual: {currentMode}</Badge>
            <Badge variant="outline">auth + notifications</Badge>
          </>
        }
      />

      {loading ? (
        <EmptyState
          title="Carregando configurações"
          description="Buscando status de autenticação e parâmetros seguros do backend."
          icon={ShieldAlert}
        />
      ) : null}

      {hasError ? (
        <EmptyState
          title="Erro ao carregar configurações"
          description="Não foi possível sincronizar as preferências do ambiente."
          icon={ShieldAlert}
        />
      ) : null}

      {safe ? (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "auth" | "notifications")}>
          <TabsList>
            <TabsTrigger value="auth">
              <LockKeyhole className="size-4" />
              Autenticação
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Mail className="size-4" />
              Notificações
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
              onSave={() => saveMutation.mutate(undefined)}
              isSaving={saveMutation.isPending}
              onTestSmtp={() => smtpTestMutation.mutate(undefined)}
              isTestingSmtp={smtpTestMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
