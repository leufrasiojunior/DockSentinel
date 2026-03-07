import { Card } from "../../shared/components/ui/Card";
import { Button } from "../../shared/components/ui/Button";
import { useSettings } from "../../features/settings/hooks/useSettings";
import { AuthSettings } from "../../features/settings/components/AuthSettings";
import { NotificationSettings } from "../../features/settings/components/NotificationSettings";
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
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-gray-600">Auth e Notificações em abas separadas.</p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={activeTab === "auth" ? "primary" : "ghost"}
          onClick={() => setActiveTab("auth")}
        >
          Autenticação
        </Button>
        <Button
          type="button"
          variant={activeTab === "notifications" ? "primary" : "ghost"}
          onClick={() => setActiveTab("notifications")}
        >
          Notificações
        </Button>
      </div>

      {loading && (
        <Card className="px-4 py-3">
          <div className="text-sm text-gray-600">Carregando...</div>
        </Card>
      )}

      {hasError && (
        <Card className="border-red-200 bg-red-50 px-4 py-3">
          <div className="text-sm text-red-700">
            Erro ao carregar configurações.
          </div>
        </Card>
      )}

      {safe && (
        <Card className="p-4">
          {activeTab === "auth" ? (
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
          ) : (
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
              onSave={() => saveMutation.mutate()}
              isSaving={saveMutation.isPending}
              onTestSmtp={() => smtpTestMutation.mutate()}
              isTestingSmtp={smtpTestMutation.isPending}
            />
          )}
        </Card>
      )}
    </div>
  );
}
