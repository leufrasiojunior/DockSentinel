import i18n from "../../i18n";
import type { AuthMode } from "../../features/auth/api/auth";

export type LoginPayload = {
  password?: string;
  totp?: string;
};

export function needsPassword(mode: AuthMode) {
  return mode === "password" || mode === "both";
}

export function needsTotp(mode: AuthMode) {
  return mode === "totp" || mode === "both";
}

export function loginHint(mode: AuthMode) {
  if (mode === "none") return i18n.t("login.hints.none");
  if (mode === "password") return i18n.t("login.hints.password");
  if (mode === "totp") return i18n.t("login.hints.totp");
  return i18n.t("login.hints.both");
}

export function buildLoginBody(mode: AuthMode, password: string, totp: string): LoginPayload {
  const body: LoginPayload = {};
  if (needsPassword(mode)) body.password = password;
  if (needsTotp(mode)) body.totp = totp;
  return body;
}
