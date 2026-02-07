import type { AuthMode } from "../../api/auth";

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
  if (mode === "none") return "Sem login: clique em Entrar.";
  if (mode === "password") return "Informe a senha.";
  if (mode === "totp") return "Informe o código TOTP (6 dígitos).";
  return "Informe senha + TOTP.";
}

export function buildLoginBody(mode: AuthMode, password: string, totp: string): LoginPayload {
  const body: LoginPayload = {};
  if (needsPassword(mode)) body.password = password;
  if (needsTotp(mode)) body.totp = totp;
  return body;
}
