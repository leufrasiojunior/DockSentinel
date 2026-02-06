// src/api/auth.ts
import { http } from "./http";

export type AuthMode = "none" | "password" | "totp" | "both";

export type AuthStatusResponse = {
  authMode: AuthMode;
  // pode vir mais coisa no futuro sem quebrar
  [key: string]: unknown;
};

export async function getAuthStatus(): Promise<AuthStatusResponse> {
  // Swagger: GET /auth/status :contentReference[oaicite:5]{index=5}
  const data = await http<any>("/auth/status");

  // tolerância: se o backend devolver string pura
  if (typeof data === "string") {
    return { authMode: data as AuthMode };
  }

  // tolerância: se vier { mode: ... }
  if (data && typeof data === "object") {
    if (typeof data.authMode === "string") return data as AuthStatusResponse;
    if (typeof data.mode === "string") return { authMode: data.mode as AuthMode };
  }

  // fallback seguro
  return { authMode: "none" };
}

export async function login(body: { password?: string; totp?: string }) {
  // Swagger: POST /auth/login :contentReference[oaicite:6]{index=6}
  return http<any>("/auth/login", { method: "POST", body });
}

export async function me() {
  // Swagger: GET /auth/me :contentReference[oaicite:7]{index=7}
  return http<any>("/auth/me");
}

export async function logout() {
  // Swagger: POST /auth/logout :contentReference[oaicite:8]{index=8}
  return http<any>("/auth/logout", { method: "POST" });
}
