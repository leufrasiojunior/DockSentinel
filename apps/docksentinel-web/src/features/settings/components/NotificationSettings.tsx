import { useState } from "react";
import { CardHeader } from "../../../shared/components/ui/Card";
import { Button } from "../../../shared/components/ui/Button";
import { type NotificationLevel, type SmtpSecureMode, type SafeSettings } from "../api/settings";

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

interface NotificationSettingsProps {
  safe: SafeSettings;
  notificationsInAppEnabled: boolean;
  setNotificationsInAppEnabled: (v: boolean) => void;
  notificationsEmailEnabled: boolean;
  setNotificationsEmailEnabled: (v: boolean) => void;
  notificationLevel: NotificationLevel;
  setNotificationLevel: (v: NotificationLevel) => void;
  notificationReadRetentionDays: string;
  setNotificationReadRetentionDays: (v: string) => void;
  notificationUnreadRetentionDays: string;
  setNotificationUnreadRetentionDays: (v: string) => void;
  smtpHost: string;
  setSmtpHost: (v: string) => void;
  smtpPort: string;
  setSmtpPort: (v: string) => void;
  smtpSecureMode: SmtpSecureMode;
  setSmtpSecureMode: (v: SmtpSecureMode) => void;
  smtpUsername: string;
  setSmtpUsername: (v: string) => void;
  smtpPassword: string;
  setSmtpPassword: (v: string) => void;
  smtpFromName: string;
  setSmtpFromName: (v: string) => void;
  smtpFromEmail: string;
  setSmtpFromEmail: (v: string) => void;
  onSave: () => void;
  isSaving: boolean;
  onTestSmtp: () => void;
  isTestingSmtp: boolean;
}

export function NotificationSettings({
  safe,
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
  onSave,
  isSaving,
  onTestSmtp,
  isTestingSmtp,
}: NotificationSettingsProps) {
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [presetSelected, setPresetSelected] = useState<ProviderPreset | null>(null);
  const [presetHost, setPresetHost] = useState("");
  const [presetPort, setPresetPort] = useState("587");
  const [presetMode, setPresetMode] = useState<SmtpSecureMode>("starttls");

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

  return (
    <div className="space-y-4">
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
        <Button type="button" variant="ghost" onClick={onTestSmtp} disabled={isTestingSmtp}>
          {isTestingSmtp ? "Testando..." : "Testar envio SMTP"}
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? "Salvando..." : "Salvar notificações"}
        </Button>
      </div>

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
