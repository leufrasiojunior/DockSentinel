import { useState } from "react";
import { BellRing, MailCheck, MailOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

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
import { type Locale, SUPPORTED_LOCALES } from "../../../i18n/locale";
import { getLocaleLabel, getNotificationLevelLabel } from "../../../i18n/helpers";
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
  defaultLocale: Locale;
  setDefaultLocale: (v: Locale) => void;
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
  const { t } = useTranslation();
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

  function getProviderLabel(preset: ProviderPreset | null) {
    if (!preset) return "";
    return preset.id === "custom" ? t("common.states.custom") : preset.label;
  }

  return (
    <>
      <SectionCard
        title={t("settings.notifications.sectionTitle")}
        description={t("settings.notifications.sectionDescription")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onTestSmtp} disabled={isTestingSmtp}>
              {isTestingSmtp ? t("settings.notifications.testing") : t("common.actions.testSmtp")}
            </Button>
            <Button type="button" variant="primary" onClick={onSave} disabled={isSaving}>
              {isSaving ? t("common.actions.saving") : t("settings.notifications.save")}
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
                  <div className="text-sm font-semibold text-foreground">{t("settings.notifications.inAppTitle")}</div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {t("settings.notifications.inAppDescription")}
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
                  <div className="text-sm font-semibold text-foreground">{t("settings.notifications.emailTitle")}</div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {t("settings.notifications.emailDescription")}
                </div>
              </div>
              <Switch checked={notificationsEmailEnabled} onCheckedChange={setNotificationsEmailEnabled} />
            </div>
          </Card>

          <FormField label={t("common.labels.defaultLocale")} description={t("settings.notifications.defaultLocaleDescription")}>
            <Select
              value={defaultLocale}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDefaultLocale(e.target.value as Locale)}
            >
              {SUPPORTED_LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {getLocaleLabel(t, locale)}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label={t("settings.notifications.notificationLevel")} description={t("settings.notifications.notificationLevelDescription")}>
            <Select
              value={notificationLevel}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setNotificationLevel(e.target.value as NotificationLevel)
              }
            >
              <option value="all">{getNotificationLevelLabel(t, "all")}</option>
              <option value="errors_only">{getNotificationLevelLabel(t, "errors_only")}</option>
            </Select>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("settings.notifications.readRetention")}>
              <Input
                type="number"
                min={1}
                max={3650}
                value={notificationReadRetentionDays}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotificationReadRetentionDays(e.target.value)}
              />
            </FormField>
            <FormField label={t("settings.notifications.unreadRetention")}>
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
              label={t("settings.notifications.smtpPresets")}
              description={t("settings.notifications.smtpPresetsDescription")}
            >
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((preset) => (
                  <Button key={preset.id} type="button" size="sm" variant="outline" onClick={() => openProviderModal(preset)}>
                    {getProviderLabel(preset)}
                  </Button>
                ))}
              </div>
            </FormField>
          </div>

          <FormField label={t("settings.notifications.smtpHost")} description={t("settings.notifications.smtpHostDescription")}>
            <Input
              value={smtpHost}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpHost(e.target.value)}
              placeholder="smtp.gmail.com"
            />
          </FormField>

          <FormField label={t("settings.notifications.smtpPort")}>
            <Input
              type="number"
              min={1}
              max={65535}
              value={smtpPort}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpPort(e.target.value)}
            />
          </FormField>

          <FormField label={t("settings.notifications.security")}>
            <Select
              value={smtpSecureMode}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSmtpSecureMode(e.target.value as SmtpSecureMode)}
            >
              <option value="starttls">STARTTLS</option>
              <option value="tls">SSL/TLS</option>
            </Select>
          </FormField>

          <FormField
            label={t("settings.notifications.smtpUsername")}
            description={
              safe?.hasSmtpPassword
                ? t("settings.notifications.smtpUsernameSavedDescription")
                : t("settings.notifications.smtpUsernameDescription")
            }
          >
            <Input
              value={smtpUsername}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpUsername(e.target.value)}
              placeholder={t("settings.notifications.placeholders.username")}
            />
          </FormField>

          <FormField
            className="md:col-span-2"
            label={t("settings.notifications.smtpPassword")}
            description={
              safe?.hasSmtpPassword
                ? t("settings.notifications.smtpPasswordSavedDescription")
                : t("settings.notifications.smtpPasswordDescription")
            }
          >
            <Input
              type="password"
              value={smtpPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpPassword(e.target.value)}
              placeholder={
                safe?.hasSmtpPassword
                  ? t("settings.notifications.placeholders.currentPasswordProtected")
                  : t("settings.notifications.placeholders.password")
              }
            />
          </FormField>

          <FormField label={t("settings.notifications.fromName")}>
            <Input
              value={smtpFromName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpFromName(e.target.value)}
              placeholder="DockSentinel"
            />
          </FormField>

          <FormField
            label={t("settings.notifications.fromEmail")}
            description={t("settings.notifications.fromEmailDescription")}
          >
            <Input
              type="email"
              value={smtpFromEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpFromEmail(e.target.value)}
              placeholder={t("settings.notifications.placeholders.fromEmail")}
            />
          </FormField>
        </div>

        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <MailOpen className="size-3.5" />
          <span>
            {t("settings.notifications.passwordStoredLabel")}: {safe.hasSmtpPassword ? t("common.states.yes") : t("common.states.no")}
          </span>
          <Badge variant={safe.hasSmtpPassword ? "success" : "outline"}>
            {safe.hasSmtpPassword ? t("settings.notifications.ready") : t("settings.notifications.pending")}
          </Badge>
        </div>
      </SectionCard>

      <Dialog open={presetModalOpen} onOpenChange={setPresetModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("settings.notifications.presetDialogTitle", { name: getProviderLabel(presetSelected) })}
            </DialogTitle>
            <DialogDescription>
              {t("settings.notifications.presetDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField className="md:col-span-2" label={t("settings.notifications.smtpHost")}>
              <Input value={presetHost} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPresetHost(e.target.value)} />
            </FormField>

            <FormField label={t("settings.notifications.smtpPort")}>
              <Input
                type="number"
                value={presetPort}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPresetPort(e.target.value)}
              />
            </FormField>

            <FormField label={t("settings.notifications.security")}>
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
              {t("common.actions.cancel")}
            </Button>
            <Button type="button" variant="primary" onClick={applyProviderPreset}>
              {t("settings.notifications.applyPreset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
