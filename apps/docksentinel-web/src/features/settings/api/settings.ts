import { http } from "../../../shared/api/http";
import type { Locale } from "../../../i18n/locale";
import type { AuthMode } from "../../auth/api/auth";

export type LogLevel = "error" | "warn" | "info" | "debug";
export type SmtpSecureMode = "starttls" | "tls";
export type NotificationLevel = "all" | "errors_only";

export type SafeSettings = {
  authMode: AuthMode;
  logLevel: LogLevel;
  hasPassword: boolean;
  hasTotp: boolean;
  defaultLocale: Locale;
  notificationsInAppEnabled: boolean;
  notificationsEmailEnabled: boolean;
  notificationLevel: NotificationLevel;
  notificationReadRetentionDays: number;
  notificationUnreadRetentionDays: number;
  environmentHealthcheckIntervalMin: number;
  notificationRecipientEmail: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecureMode: SmtpSecureMode;
  smtpUsername: string | null;
  hasSmtpPassword: boolean;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  [key: string]: unknown;
};

export type UpdateSettingsBody = Partial<Pick<SafeSettings, "authMode" | "logLevel" | "defaultLocale">> & {
  adminPassword?: string;
  notificationsInAppEnabled?: boolean;
  notificationsEmailEnabled?: boolean;
  notificationLevel?: NotificationLevel;
  notificationReadRetentionDays?: number;
  notificationUnreadRetentionDays?: number;
  environmentHealthcheckIntervalMin?: number;
  notificationRecipientEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecureMode?: SmtpSecureMode;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpFromName?: string;
  smtpFromEmail?: string;
};

export type SmtpTestBody = {
  notificationRecipientEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecureMode?: SmtpSecureMode;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpFromName?: string;
  smtpFromEmail?: string;
};

export async function getSettings(): Promise<SafeSettings> {
  return http<SafeSettings>("/settings");
}

export async function updateSettings(body: UpdateSettingsBody): Promise<unknown> {
  return http("/settings", { method: "PUT", body });
}

export async function testSmtp(body?: SmtpTestBody): Promise<{ ok: boolean }> {
  return http<{ ok: boolean }>("/settings/smtp/test", { method: "POST", body });
}
