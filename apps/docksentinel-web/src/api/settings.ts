import { http } from "./http";
import type { AuthMode } from "./auth";
import type { LogLevel } from "./setup";

export type SafeSettings = {
  authMode?: AuthMode;
  logLevel?: LogLevel;
  setupCompletedAt: string | null;
  [key: string]: unknown;
};

export type UpdateSettingsBody = Partial<Pick<SafeSettings, "authMode" | "logLevel">> & {
  adminPassword?: string;
};


export async function getSettings(): Promise<SafeSettings> {
  return http<SafeSettings>("/settings");
}

export async function updateSettings(body: UpdateSettingsBody): Promise<any> {
  return http("/settings", { method: "PUT", body });
}
