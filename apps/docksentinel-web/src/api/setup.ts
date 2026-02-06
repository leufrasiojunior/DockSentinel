// src/api/setup.ts
import { http } from "./http";
import type { AuthMode } from "./auth";

export type LogLevel = "error" | "warn" | "info" | "debug";

export type SetupDto = {
  authMode: AuthMode;
  logLevel?: LogLevel;
  adminPassword?: string;
  totpSecret?: string;
};

export async function runSetup(body: SetupDto) {
  return http<any>("/setup", { method: "POST", body });
}
