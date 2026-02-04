import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authApi } from "../api/auth";

export function LoginPage() {
  const statusQ = useQuery({ queryKey: ["auth-status"], queryFn: authApi.status, retry: false });
  const mode = statusQ.data?.mode;

  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await authApi.login({
        password: mode === "password" || mode === "both" ? password : undefined,
        totp: mode === "totp" || mode === "both" ? totp : undefined,
      });
      location.href = "/";
    } catch (e: any) {
      setErr(e?.message ?? "Falha no login");
    }
  }

  if (statusQ.isLoading) return null;
  if (mode === "none") {
    location.href = "/";
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow">
        <div className="text-lg font-semibold">Entrar</div>
        <div className="text-sm text-slate-500">Autenticação: {mode}</div>

        <div className="mt-6 space-y-3">
          {(mode === "password" || mode === "both") && (
            <div>
              <label className="text-sm">Senha</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
              />
            </div>
          )}

          {(mode === "totp" || mode === "both") && (
            <div>
              <label className="text-sm">TOTP</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                inputMode="numeric"
                placeholder="123456"
              />
            </div>
          )}

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button className="w-full rounded-md bg-blue-600 text-white py-2 text-sm hover:bg-blue-700">
            Entrar
          </button>
        </div>
      </form>
    </div>
  );
}
