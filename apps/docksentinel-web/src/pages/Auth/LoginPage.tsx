import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "../../layouts/ui/Button";
import { Card, CardHeader } from "../../layouts/ui/Card";
import { useToast } from "../../layouts/ui/ToastProvider";

import { getAuthStatus, login } from "../../api/auth";
import { buildLoginBody, loginHint, needsPassword, needsTotp } from "./loginUtils";

export function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");

  const statusQuery = useQuery({
    queryKey: ["auth", "status"],
    queryFn: getAuthStatus,
    retry: 1,
  });

  const authMode = statusQuery.data?.authMode ?? "password";
  const from = (location.state as any)?.from ?? "/dashboard";

  const hints = loginHint(authMode);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const body = buildLoginBody(authMode, password, totp);

      // em authMode=none, body vazio (LoginDto permite campos opcionais)
      await login(body);
    },
    onSuccess: () => {
      toast.success("Login OK.", "Auth");
      nav(from, { replace: true });
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Falha no login", "Auth");
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-center gap-2">
          <img src="/logo.png" alt="DockSentinel" className="h-10 w-10" />
          <div className="text-xl font-semibold">DockSentinel</div>
        </div>

        <Card className="p-4">
          <CardHeader
            title="Login"
            subtitle={
              statusQuery.isLoading
                ? "Carregando modo de autenticação..."
                : hints
            }
          />

          {statusQuery.isError && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Falha ao carregar <span className="font-mono">/auth/status</span>:{" "}
              {(statusQuery.error as any)?.message ?? "erro"}
            </div>
          )}

          <div className="space-y-3">
            {needsPassword(authMode) && (
              <label className="space-y-1 block">
                <div className="text-sm font-medium text-gray-700">Senha</div>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                />
              </label>
            )}

            {needsTotp(authMode) && (
              <label className="space-y-1 block">
                <div className="text-sm font-medium text-gray-700">TOTP</div>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                />
              </label>
            )}

            <div className="flex gap-2">
              <Button
                variant="primary"
                type="button"
                onClick={() => loginMutation.mutate()}
                disabled={loginMutation.isPending || statusQuery.isLoading}
              >
                Entrar
              </Button>

              <Button type="button" onClick={() => nav("/settings")}>
                Configurar
              </Button>
            </div>

            {loginMutation.isPending && (
              <div className="text-sm text-gray-600">Entrando...</div>
            )}
          </div>
        </Card>

        <div className="text-center text-xs text-gray-500">
          Dica dev: em ambiente de desenvolvimento, prefira acessar o front pela
          porta do Vite (e usar proxy) para manter cookies.
        </div>
      </div>
    </div>
  );
}
