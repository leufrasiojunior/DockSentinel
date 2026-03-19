import { useState } from "react";
import { BellRing, MailCheck, MailOpen } from "lucide-react";

import { FormField } from "../../../components/product/form-field";
import { SectionCard } from "../../../components/product/section-card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";
import { type SafeSettings, type NotificationLevel, type SmtpSecureMode } from "../api/settings";

type ProviderPreset = {
  id: "gmail" | "outlook" | "hotmail" | "yahoo" | "custom";
  label: string;
  host: string;
  port: number;
  secureMode: SmtpSecureMode;
};

const PROVIDERS: ProviderPreset[] = [
  { id: "gmail", label: "Gmail", host: "smtp.gmail.com", port: 587, secureMode: "starttls" },
  { id: "outlook", label: "Outlook", host: "smtp-mail.outlook.com", port: 587, secureMode: "starttls" },
  { id: "hotmail", label: "Hotmail", host: "smtp-mail.outlook.com", port: 587, secureMode: "starttls" },
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
    <>
      <SectionCard
        title="Notifications delivery"
        description="Canal visual na aplicação e envio por SMTP com presets rápidos."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onTestSmtp} disabled={isTestingSmtp}>
              {isTestingSmtp ? "Testando..." : "Testar SMTP"}
            </Button>
            <Button type="button" variant="primary" onClick={onSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar notificações"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/60 bg-muted/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <BellRing className="size-4.5 text-foreground" />
                  <div className="text-sm font-semibold text-foreground">Notificações na tela</div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Toasts e centro de notificações dentro do painel.
                </div>
              </div>
              <Switch checked={notificationsInAppEnabled} onCheckedChange={setNotificationsInAppEnabled} />
            </div>
          </Card>

          <Card className="border-border/60 bg-muted/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <MailCheck className="size-4.5 text-foreground" />
                  <div className="text-sm font-semibold text-foreground">Notificações por e-mail</div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Usa a configuração SMTP definida abaixo para alertas automatizados.
                </div>
              </div>
              <Switch checked={notificationsEmailEnabled} onCheckedChange={setNotificationsEmailEnabled} />
            </div>
          </Card>

          <FormField label="Nível de notificação" description="Escolhe entre fluxo completo ou apenas erros.">
            <Select
              value={notificationLevel}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setNotificationLevel(e.target.value as NotificationLevel)
              }
            >
              <option value="all">Todas</option>
              <option value="errors_only">Somente erros</option>
            </Select>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Retenção lidas (dias)">
              <Input
                type="number"
                min={1}
                max={3650}
                value={notificationReadRetentionDays}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotificationReadRetentionDays(e.target.value)}
              />
            </FormField>
            <FormField label="Retenção não lidas (dias)">
              <Input
                type="number"
                min={1}
                max={3650}
                value={notificationUnreadRetentionDays}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotificationUnreadRetentionDays(e.target.value)}
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField
              label="Presets SMTP"
              description="Aplica rapidamente host, porta e segurança do provedor."
            >
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((preset) => (
                  <Button key={preset.id} type="button" size="sm" variant="outline" onClick={() => openProviderModal(preset)}>
                    {preset.label}
                  </Button>
                ))}
              </div>
            </FormField>
          </div>

          <FormField label="SMTP host" description="Endpoint do provedor de e-mail.">
            <Input
              value={smtpHost}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpHost(e.target.value)}
              placeholder="smtp.gmail.com"
            />
          </FormField>

          <FormField label="SMTP port">
            <Input
              type="number"
              min={1}
              max={65535}
              value={smtpPort}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpPort(e.target.value)}
            />
          </FormField>

          <FormField label="Segurança">
            <Select
              value={smtpSecureMode}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSmtpSecureMode(e.target.value as SmtpSecureMode)}
            >
              <option value="starttls">STARTTLS</option>
              <option value="tls">SSL/TLS</option>
            </Select>
          </FormField>

          <FormField
            label="SMTP usuário"
            description={safe?.hasSmtpPassword ? "Senha já cadastrada no backend." : "Credencial do provedor SMTP."}
          >
            <Input
              value={smtpUsername}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpUsername(e.target.value)}
              placeholder="usuario"
            />
          </FormField>

          <FormField
            className="md:col-span-2"
            label="SMTP senha"
            description={safe?.hasSmtpPassword ? "Deixe em branco para manter a senha atual." : "Opcional para testes imediatos."}
          >
            <Input
              type="password"
              value={smtpPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpPassword(e.target.value)}
              placeholder={safe?.hasSmtpPassword ? "Senha atual protegida" : "Senha"}
            />
          </FormField>

          <FormField label="From name">
            <Input
              value={smtpFromName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpFromName(e.target.value)}
              placeholder="DockSentinel"
            />
          </FormField>

          <FormField
            label="From email"
            description="O destinatário de auto-notificação será este mesmo e-mail."
          >
            <Input
              type="email"
              value={smtpFromEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpFromEmail(e.target.value)}
              placeholder="seuemail@provedor.com"
            />
          </FormField>
        </div>

        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <MailOpen className="size-3.5" />
          <span>SMTP password stored: {safe.hasSmtpPassword ? "yes" : "no"}</span>
          <Badge variant={safe.hasSmtpPassword ? "success" : "outline"}>
            {safe.hasSmtpPassword ? "Ready" : "Pending"}
          </Badge>
        </div>
      </SectionCard>

      <Dialog open={presetModalOpen} onOpenChange={setPresetModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preset SMTP: {presetSelected?.label ?? ""}</DialogTitle>
            <DialogDescription>
              Ajuste host, porta e modo de segurança antes de aplicar o preset ao formulário principal.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField className="md:col-span-2" label="Host">
              <Input value={presetHost} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPresetHost(e.target.value)} />
            </FormField>

            <FormField label="Porta">
              <Input
                type="number"
                value={presetPort}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPresetPort(e.target.value)}
              />
            </FormField>

            <FormField label="Segurança">
              <Select
                value={presetMode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPresetMode(e.target.value as SmtpSecureMode)}
              >
                <option value="starttls">STARTTLS</option>
                <option value="tls">SSL/TLS</option>
              </Select>
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPresetModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={applyProviderPreset}>
              Aplicar preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
