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

export type SystemVersionCheck = {
  checkedAt: string;
  server: {
    currentVersion: string;
    latestVersion: string | null;
    hasUpdate: boolean;
    releaseUrl: string;
  };
  agent: {
    latestVersion: string | null;
    releaseUrl: string;
    updateCommand: string;
  };
};

export async function getSystemVersionCheck(
  refresh = false,
): Promise<SystemVersionCheck> {
  return http<SystemVersionCheck>(
    `/api/settings/version-check${refresh ? "?refresh=true" : ""}`,
  );
}

function cleanSemver(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/^v/i, "");
  return /^\d+\.\d+\.\d+/.test(cleaned) ? cleaned : null;
}

export function isAgentOutdated(
  currentVersion?: string | null,
  latestVersion?: string | null,
): boolean {
  const cur = cleanSemver(currentVersion);
  const lat = cleanSemver(latestVersion);
  if (!cur || !lat || cur === lat) return false;

  const parse = (v: string) =>
    v
      .split("-")[0]
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);

  const [cMaj = 0, cMin = 0, cPat = 0] = parse(cur);
  const [lMaj = 0, lMin = 0, lPat = 0] = parse(lat);

  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}
