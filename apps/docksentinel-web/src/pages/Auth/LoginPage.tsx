import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, ShieldCheck, Sparkles, Workflow } from "lucide-react";

import { getAuthStatus, login } from "../../features/auth/api/auth";
import { Badge } from "../../components/ui/badge";
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
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 shadow-[0_32px_120px_-52px_rgba(8,13,24,0.7)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden overflow-hidden border-r border-border/60 bg-sidebar px-10 py-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/95 p-3">
                <img src={logo} alt="DockSentinel" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-xl font-semibold tracking-tight">DockSentinel</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-sidebar-foreground/60">
                  Docker control plane
                </div>
              </div>
            </div>

            <div className="mt-12 max-w-xl space-y-5">
              <Badge variant="info">Ops premium interface</Badge>
              <h1 className="text-4xl font-semibold tracking-tight">
                Operação de containers com foco em leitura rápida e ação segura.
              </h1>
              <p className="text-base leading-relaxed text-sidebar-foreground/72">
                Acesse jobs, scheduler, notificações e configurações a partir de uma interface mais densa, clara e consistente.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.75rem] border border-white/8 bg-white/6 p-5">
              <div className="flex items-center gap-3 text-sm font-medium">
                <Workflow className="size-4.5" />
                Jobs e automação
              </div>
              <p className="mt-2 text-sm leading-relaxed text-sidebar-foreground/68">
                Observe o fluxo de atualização, priorize falhas e acompanhe o scheduler em tempo real.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/8 bg-white/6 p-5">
              <div className="flex items-center gap-3 text-sm font-medium">
                <ShieldCheck className="size-4.5" />
                Segurança operacional
              </div>
              <p className="mt-2 text-sm leading-relaxed text-sidebar-foreground/68">
                Controle autenticação, TOTP e notificações sem sair do painel.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-border/60 bg-card p-2">
                <img src={logo} alt="DockSentinel" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-lg font-semibold">DockSentinel</div>
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Sign in</div>
              </div>
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-border/60 bg-muted/45 p-3">
                    <LockKeyhole className="size-5 text-foreground" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle>Entrar</CardTitle>
                    <CardDescription>
                      {statusQuery.isLoading ? "Carregando modo de autenticação..." : hints}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">modo: {authMode}</Badge>
                  <Badge variant="outline">destino: {from}</Badge>
                </div>

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

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="primary"
                    type="button"
                    onClick={() => loginMutation.mutate()}
                    disabled={loginMutation.isPending || statusQuery.isLoading}
                  >
                    <Sparkles className="size-4" />
                    Entrar
                  </Button>

                  <Button type="button" variant="outline" onClick={() => nav("/settings")}>
                    Configurar
                  </Button>
                </div>

                {loginMutation.isPending ? (
                  <div className="text-sm text-muted-foreground">Entrando...</div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
