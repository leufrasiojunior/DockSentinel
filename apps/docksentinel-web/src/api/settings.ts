import { http } from "./http";
import type { AuthMode } from "./auth";

export type LogLevel = "error" | "warn" | "info" | "debug";

export type SafeSettings = {
  authMode: AuthMode;
  logLevel: LogLevel;
  hasPassword: boolean;
  hasTotp: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  [key: string]: unknown;
};

export type UpdateSettingsBody = Partial<Pick<SafeSettings, "authMode" | "logLevel">> & {
  adminPassword?: string;
};

export async function getSettings(): Promise<SafeSettings> {
  return http<SafeSettings>("/settings");
}

export async function updateSettings(body: UpdateSettingsBody): Promise<unknown> {
  return http("/settings", { method: "PUT", body });
}
