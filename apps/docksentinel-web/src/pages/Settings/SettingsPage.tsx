import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";

import { Card, CardHeader } from "../../shared/components/ui/Card";
import { Button } from "../../shared/components/ui/Button";
import { Badge } from "../../shared/components/ui/Badge";
import { useToast } from "../../shared/components/ui/ToastProvider";
import { useConfirm } from "../../shared/components/ui/ConfirmProvider";

import { getAuthStatus, logout, type AuthMode } from "../../api/auth";
import {
  getSettings,
  testSmtp,
  updateSettings,
  type LogLevel,
  type NotificationLevel,
  type SafeSettings,
  type SmtpSecureMode,
  type UpdateSettingsBody,
} from "../../api/settings";
import { totpConfirm, totpInit, type TotpInitResponse } from "../../api/totp";

type SettingsTab = "auth" | "notifications";
type ProviderPreset = {
  id: "gmail" | "outlook" | "hotmail" | "yahoo" | "custom";
  label: string;
  host: string;
  port: number;
  secureMode: SmtpSecureMode;
};

const PROVIDERS: ProviderPreset[] = [
  { id: "gmail", label: "Gmail", host: "smtp.gmail.com", port: 587, secureMode: "starttls" },
  {
    id: "outlook",
    label: "Outlook",
    host: "smtp-mail.outlook.com",
    port: 587,
    secureMode: "starttls",
  },
  {
    id: "hotmail",
    label: "Hotmail",
    host: "smtp-mail.outlook.com",
    port: 587,
    secureMode: "starttls",
  },
  { id: "yahoo", label: "Yahoo", host: "smtp.mail.yahoo.com", port: 587, secureMode: "starttls" },
  { id: "custom", label: "Personalizado", host: "", port: 587, secureMode: "starttls" },
];

function needsPassword(mode: AuthMode) {
  return mode === "password" || mode === "both";
}

function needsTotp(mode: AuthMode) {
  return mode === "totp" || mode === "both";
}

function modeHasTotp(mode: AuthMode) {
  return mode === "totp" || mode === "both";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "n/a";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return value;
  return new Date(ts).toLocaleString();
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

export function SettingsPage() {
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
  const safe = (settingsQuery.data ?? null) as SafeSettings | null;

  const hasPassword = safe?.hasPassword ?? false;
  const hasTotp = safe?.hasTotp ?? false;

  const [desiredMode, setDesiredMode] = useState<AuthMode>(currentMode);
  const [logLevel, setLogLevel] = useState<LogLevel>((safe?.logLevel as LogLevel) ?? "info");

  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [totp, setTotp] = useState<TotpInitResponse | null>(null);
  const [totpToken, setTotpToken] = useState("");
  const [totpConfirmed, setTotpConfirmed] = useState(false);
  const [totpNow, setTotpNow] = useState(() => Date.now());

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

  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [presetSelected, setPresetSelected] = useState<ProviderPreset | null>(null);
  const [presetHost, setPresetHost] = useState("");
  const [presetPort, setPresetPort] = useState("587");
  const [presetMode, setPresetMode] = useState<SmtpSecureMode>("starttls");

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

  const wantPassword = needsPassword(desiredMode);
  const wantTotp = needsTotp(desiredMode);
  const totpAlreadyEnabledByMode = useMemo(() => modeHasTotp(currentMode), [currentMode]);
  const totpActuallyEnabled = hasTotp || totpAlreadyEnabledByMode;
  const isChangingPassword = newPassword.length > 0 || newPassword2.length > 0;

  const canSaveMode =
    (!wantTotp || totpActuallyEnabled || totpConfirmed) &&
    (!wantPassword || hasPassword || isChangingPassword);

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

  const saveMutation = useMutation({
    mutationFn: async (options?: { totpConfirmedOverride?: boolean }) => {
      const body: UpdateSettingsBody = { authMode: desiredMode, logLevel };
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

      if (wantPassword) {
        if (isChangingPassword) {
          if (newPassword !== newPassword2) throw new Error("As senhas não conferem.");
          if (newPassword.length < 8) throw new Error("Senha precisa ter pelo menos 8 caracteres.");
          body.adminPassword = newPassword;
        } else if (!hasPassword) {
          throw new Error("Defina uma senha (mínimo 8 caracteres) para este modo.");
        }
      }

      const hasEffectiveTotp =
        totpActuallyEnabled || totpConfirmed || options?.totpConfirmedOverride === true;

      if (wantTotp && !hasEffectiveTotp) {
        throw new Error("Configure e confirme o TOTP antes de salvar este modo.");
      }

      return updateSettings(body);
    },
    onSuccess: async () => {
      toast.success("Configurações salvas.", "Settings");
      setSmtpPassword("");
      await qc.invalidateQueries({ queryKey: ["settings", "safe"] });
      await qc.invalidateQueries({ queryKey: ["auth", "status"] });

      if (desiredMode === "password") {
        try {
          await logout();
        } catch {
          // ok
        } finally {
          qc.removeQueries({ queryKey: ["auth", "me"] });
          nav("/login", { replace: true });
        }
        return;
      }

      if (currentMode === "none" && desiredMode !== "none") {
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

  async function handleSaveClicked() {
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

    saveMutation.mutate(undefined);
  }

  const totpInitMutation = useMutation({
    mutationFn: async () => totpInit({ label: "DockSentinel" }),
    onSuccess: (resp) => {
      setTotp(resp);
      setTotpToken("");
      setTotpConfirmed(false);
      toast.info("TOTP iniciado. Escaneie e confirme.", "TOTP");
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Falha no init"), "TOTP"),
  });

  const totpConfirmMutation = useMutation({
    mutationFn: async () => {
      if (!totp) throw new Error("Inicie o TOTP primeiro.");
      return totpConfirm({ challengeId: totp.challengeId, token: totpToken });
    },
    onSuccess: (resp) => {
      if (!resp.ok) {
        toast.error("Resposta inesperada do confirm.", "TOTP");
        return;
      }

      setTotpConfirmed(true);
      toast.success(`TOTP confirmado (authMode final: ${resp.authMode}).`, "TOTP");

      if (desiredMode === "totp" || desiredMode === "both") {
        saveMutation.mutate({ totpConfirmedOverride: true });
      }
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Falha ao confirmar"), "TOTP"),
  });

  function openProviderModal(preset: ProviderPreset) {
    setPresetSelected(preset);
    setPresetHost(preset.host || smtpHost);
    setPresetPort(String(preset.port || Number(smtpPort) || 587));
    setPresetMode(preset.secureMode || smtpSecureMode);
    setPresetModalOpen(true);
  }

  function applyProviderPreset() {
    setSmtpHost(presetHost.trim());
    setSmtpPort(String(Number(presetPort) || 587));
    setSmtpSecureMode(presetMode);
    setPresetModalOpen(false);
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
            Erro ao carregar:{" "}
            {errorMessage(statusQuery.error, "") ||
              errorMessage(settingsQuery.error, "") ||
              "desconhecido"}
          </div>
        </Card>
      )}

      {safe && activeTab === "auth" && (
        <Card className="p-4">
          <CardHeader
            title="Autenticação"
            subtitle={
              <>
                Modo atual: <Badge tone="gray">{currentMode}</Badge>
                <span className="ml-2 text-xs text-gray-500">criado: {formatDateTime(safe.createdAt)}</span>
                <span className="ml-2 text-xs text-gray-500">
                  atualizado: {formatDateTime(safe.updatedAt)}
                </span>
              </>
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Auth mode</div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={desiredMode}
                onChange={(e) => {
                  setDesiredMode(e.target.value as AuthMode);
                  setTotp(null);
                  setTotpToken("");
                  setTotpConfirmed(false);
                }}
              >
                <option value="none"> Sem senha</option>
                <option value="password">Somente senha</option>
                <option value="totp">TOTP</option>
                <option value="both">Ambos (Senha + TOTP)</option>
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Log level</div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value as LogLevel)}
              >
                <option value="error">error</option>
                <option value="warn">warn</option>
                <option value="info">info</option>
                <option value="debug">debug</option>
              </select>
            </label>

            {wantPassword && (
              <div className="md:col-span-2 grid gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-700">Definir/alterar senha</div>
                  <Badge tone="gray">min 8</Badge>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded-md border px-3 py-2 text-sm"
                    type="password"
                    placeholder="Nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <input
                    className="rounded-md border px-3 py-2 text-sm"
                    type="password"
                    placeholder="Confirmar nova senha"
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                  />
                </div>

                {!hasPassword && !isChangingPassword && (
                  <div className="text-xs text-amber-700">
                    Este modo exige senha e ainda não existe senha configurada. Defina uma senha para salvar.
                  </div>
                )}

                {hasPassword && !isChangingPassword && (
                  <div className="text-xs text-gray-500">Se você não preencher, a senha atual será mantida.</div>
                )}
              </div>
            )}
          </div>

          {wantTotp && !totpActuallyEnabled && (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-gray-700">
                  Ativar TOTP (obrigatório para {desiredMode})
                </div>
                <Button
                  type="button"
                  onClick={() => totpInitMutation.mutate()}
                  disabled={totpInitMutation.isPending}
                >
                  Iniciar TOTP
                </Button>
              </div>

              {totp && (
                <div className="mt-3 grid gap-4 md:grid-cols-[220px_1fr]">
                  <div className="flex items-center justify-center rounded-lg border bg-white p-3">
                    <QRCodeSVG value={totp.otpauthUrl} size={180} />
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="text-gray-600">Secret</div>
                      <div className="font-mono">{totp.secret}</div>
                    </div>

                    {totpExpiresInSec !== null && (
                      <div className="text-sm">
                        <div className="text-gray-600">Expira em</div>
                        <div className="font-mono">
                          {totpExpiresInSec}s
                          {totpExpiresInSec === 0 && (
                            <span className="ml-2 text-red-600">Expirado - inicie novamente.</span>
                          )}
                        </div>
                      </div>
                    )}

                    <label className="space-y-1 block">
                      <div className="text-sm font-medium text-gray-700">Token (6 dígitos)</div>
                      <input
                        className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                        value={totpToken}
                        onChange={(e) => setTotpToken(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                      />
                    </label>

                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        type="button"
                        onClick={() => totpConfirmMutation.mutate()}
                        disabled={totpConfirmMutation.isPending || totpExpiresInSec === 0}
                      >
                        Confirmar
                      </Button>
                      {totpConfirmed && <Badge tone="green">Confirmado</Badge>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              variant="primary"
              type="button"
              onClick={handleSaveClicked}
              disabled={saveMutation.isPending || !canSaveMode}
              title={!canSaveMode ? "Complete TOTP/senha antes de salvar." : undefined}
            >
              Salvar
            </Button>

            {saveMutation.isPending && (
              <span className="text-sm text-gray-600 self-center">Salvando...</span>
            )}
          </div>
        </Card>
      )}

      {safe && activeTab === "notifications" && (
        <Card className="p-4">
          <CardHeader title="Notificações" subtitle="Canal na tela + e-mail SMTP com presets." />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notificationsInAppEnabled}
                onChange={(e) => setNotificationsInAppEnabled(e.target.checked)}
              />
              <span className="text-sm text-gray-700">Notificações na tela</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notificationsEmailEnabled}
                onChange={(e) => setNotificationsEmailEnabled(e.target.checked)}
              />
              <span className="text-sm text-gray-700">Notificações por e-mail</span>
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Nível de notificação</div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={notificationLevel}
                onChange={(e) => setNotificationLevel(e.target.value as NotificationLevel)}
              >
                <option value="all">Todas</option>
                <option value="errors_only">Somente erros</option>
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Retenção de lidas (dias)</div>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                type="number"
                min={1}
                max={3650}
                value={notificationReadRetentionDays}
                onChange={(e) => setNotificationReadRetentionDays(e.target.value)}
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">
                Retenção de não lidas (dias)
              </div>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                type="number"
                min={1}
                max={3650}
                value={notificationUnreadRetentionDays}
                onChange={(e) => setNotificationUnreadRetentionDays(e.target.value)}
              />
            </label>

            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Presets SMTP</div>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((p) => (
                  <Button key={p.id} type="button" size="sm" variant="ghost" onClick={() => openProviderModal(p)}>
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">SMTP host</div>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">SMTP port</div>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                type="number"
                min={1}
                max={65535}
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Segurança</div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={smtpSecureMode}
                onChange={(e) => setSmtpSecureMode(e.target.value as SmtpSecureMode)}
              >
                <option value="starttls">STARTTLS</option>
                <option value="tls">SSL/TLS</option>
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">
                SMTP usuário
                {safe?.hasSmtpPassword && (
                  <span className="ml-2 text-xs text-gray-500">senha já cadastrada</span>
                )}
              </div>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={smtpUsername}
                onChange={(e) => setSmtpUsername(e.target.value)}
                placeholder="usuario"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <div className="text-sm font-medium text-gray-700">SMTP senha (opcional)</div>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={safe?.hasSmtpPassword ? "Deixe em branco para manter a senha atual" : ""}
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">From name</div>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                placeholder="DockSentinel"
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">From email</div>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                type="email"
                value={smtpFromEmail}
                onChange={(e) => setSmtpFromEmail(e.target.value)}
                placeholder="seuemail@provedor.com"
              />
              <div className="text-xs text-gray-500">
                O destinatário será sempre este mesmo e-mail (auto-notificação).
              </div>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => smtpTestMutation.mutate()} disabled={smtpTestMutation.isPending}>
              {smtpTestMutation.isPending ? "Testando..." : "Testar envio SMTP"}
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => saveMutation.mutate(undefined)}
              disabled={saveMutation.isPending}
            >
              Salvar notificações
            </Button>
          </div>
        </Card>
      )}

      {presetModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Preset SMTP: {presetSelected?.label ?? ""}</h3>
              <button
                type="button"
                onClick={() => setPresetModalOpen(false)}
                className="rounded border px-2 py-1 text-xs"
              >
                Fechar
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <div className="text-sm font-medium text-gray-700">Host</div>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={presetHost}
                  onChange={(e) => setPresetHost(e.target.value)}
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Porta</div>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  type="number"
                  value={presetPort}
                  onChange={(e) => setPresetPort(e.target.value)}
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Segurança</div>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={presetMode}
                  onChange={(e) => setPresetMode(e.target.value as SmtpSecureMode)}
                >
                  <option value="starttls">STARTTLS</option>
                  <option value="tls">SSL/TLS</option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPresetModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" onClick={applyProviderPreset}>
                Aplicar preset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
