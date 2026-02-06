// src/api/totp.ts
import { http } from "./http";

export type TotpInitDto = { label: string };

export type TotpInitResponse = {
  challengeId: string;
  otpauthUrl: string;
  secret: string;
  expiresAt: string; // ISO
};

export type TotpConfirmDto = {
  challengeId: string;
  token: string;
};

export type TotpConfirmResponse = {
  ok: boolean;
  authMode: "totp" | "both" | "password" | "none";
};

export async function totpInit(body: TotpInitDto): Promise<TotpInitResponse> {
  return http<TotpInitResponse>("/settings/totp/init", { method: "POST", body });
}

export async function totpConfirm(body: TotpConfirmDto): Promise<TotpConfirmResponse> {
  return http<TotpConfirmResponse>("/settings/totp/confirm", { method: "POST", body });
}
