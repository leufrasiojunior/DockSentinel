import { fetchJson } from "./client";
import type { AuthMode } from "./types";

export const authApi = {
  status: () => fetchJson<{ mode: AuthMode }>("/auth/status"),
  me: () => fetchJson<{ ok?: boolean }>("/auth/me"),
  login: (body: { password?: string; totp?: string }) => fetchJson<void>("/auth/login", { method: "POST", body }),
  logout: () => fetchJson<void>("/auth/logout", { method: "POST" }),
};
