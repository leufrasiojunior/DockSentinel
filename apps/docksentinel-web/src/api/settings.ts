import { http } from "./http";
import type { AuthMode } from "./auth";
import type { LogLevel } from "./setup";

export type SafeSettings = {
  authMode?: AuthMode;
  logLevel?: LogLevel;
  // outros campos "safe" podem aparecer
  [key: string]: unknown;
};

export type UpdateSettingsBody = {
  authMode?: AuthMode;
  logLevel?: LogLevel;
  adminPassword?: string;
  totpSecret?: string;
  setupCompletedAt: string | null;

};

export async function getSettings(): Promise<SafeSettings> {
  return http<SafeSettings>("/settings");
}

export async function updateSettings(body: UpdateSettingsBody): Promise<any> {
  return http("/settings", { method: "PUT", body });
}
