import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import { getAuthStatus, login } from "../../features/auth/api/auth";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useToast } from "../../shared/components/ui/ToastProvider";
import { buildLoginBody, loginHint, needsPassword, needsTotp } from "./loginUtils";
import logo from "../../assets/logo2.png";

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

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
  const from = ((location.state as { from?: string } | null)?.from) ?? "/dashboard";
  const hints = loginHint(authMode);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const body = buildLoginBody(authMode, password, totp);
      await login(body);
    },
    onSuccess: () => {
      toast.success("Login OK.", "Auth");
      nav(from, { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, "Falha no login"), "Auth");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.75rem] border border-border/60 bg-card p-3 shadow-sm">
            <img src={logo} alt="DockSentinel" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">DockSentinel</div>
            <div className="mt-1 text-sm text-muted-foreground">Entrar no painel</div>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>Login</CardTitle>
            <CardDescription>
              {statusQuery.isLoading ? "Carregando modo de autenticação..." : hints}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {statusQuery.isError ? (
              <Card className="border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                Falha ao carregar <span className="font-mono">/auth/status</span>:{" "}
                {errorMessage(statusQuery.error, "erro")}
              </Card>
            ) : null}

            <div className="space-y-4">
              {needsPassword(authMode) ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Senha</div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                  />
                </div>
              ) : null}

              {needsTotp(authMode) ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">TOTP</div>
                  <Input
                    className="font-mono"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
              ) : null}
            </div>

            <Button
              variant="primary"
              type="button"
              onClick={() => loginMutation.mutate()}
              disabled={loginMutation.isPending || statusQuery.isLoading}
              className="w-full"
            >
              Entrar
            </Button>

            {loginMutation.isPending ? (
              <div className="text-sm text-muted-foreground">Entrando...</div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
