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
  return http<SafeSettings>("/api/settings");
}

export async function updateSettings(body: UpdateSettingsBody): Promise<unknown> {
  return http("/api/settings", { method: "PUT", body });
}

export async function testSmtp(body?: SmtpTestBody): Promise<{ ok: boolean }> {
  return http<{ ok: boolean }>("/api/settings/smtp/test", { method: "POST", body });
}

export type RegistryCredential = {
  id: string;
  name: string;
  serverAddress: string;
  username: string;
  hasPassword: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRegistryCredentialBody = {
  name: string;
  serverAddress: string;
  username: string;
  password: string;
  enabled?: boolean;
};

export type UpdateRegistryCredentialBody = {
  name?: string;
  serverAddress?: string;
  username?: string;
  password?: string;
  enabled?: boolean;
};

export async function listRegistries(): Promise<RegistryCredential[]> {
  return http<RegistryCredential[]>("/api/settings/registries");
}

export async function createRegistry(
  body: CreateRegistryCredentialBody,
): Promise<RegistryCredential> {
  return http<RegistryCredential>("/api/settings/registries", {
    method: "POST",
    body,
  });
}

export async function updateRegistry(
  id: string,
  body: UpdateRegistryCredentialBody,
): Promise<RegistryCredential> {
  return http<RegistryCredential>(
    `/api/settings/registries/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body,
    },
  );
}

export async function deleteRegistry(id: string): Promise<{ ok: boolean }> {
  return http<{ ok: boolean }>(
    `/api/settings/registries/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
}
