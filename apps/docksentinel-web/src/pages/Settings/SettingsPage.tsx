import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader } from "../../layouts/ui/Card";
import { Button } from "../../layouts/ui/Button";
import { Badge } from "../../layouts/ui/Badge";
import { useToast } from "../../layouts/ui/ToastProvider";
import { getAuthStatus, logout, type AuthMode } from "../../api/auth";
import { useNavigate } from "react-router-dom";
import {
  getSettings,
  updateSettings,
  type SafeSettings,
} from "../../api/settings";
import { totpInit, totpConfirm, type TotpInitResponse } from "../../api/totp";
import { runSetup, type LogLevel } from "../../api/setup";

function needsPassword(mode: AuthMode) {
  return mode === "password" || mode === "both";
}
function needsTotp(mode: AuthMode) {
  return mode === "totp" || mode === "both";
}
function modeHasTotp(mode: AuthMode) {
  return mode === "totp" || mode === "both";
}

export function SettingsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const nav = useNavigate();

  const statusQuery = useQuery({
    queryKey: ["auth", "status"],
    queryFn: getAuthStatus,
  });

  const settingsQuery = useQuery({
    queryKey: ["settings", "safe"],
    queryFn: getSettings,
  });
  const currentMode = (statusQuery.data?.authMode ?? "password") as AuthMode;
  const safe = (settingsQuery.data ?? null) as SafeSettings | null;
  const hasPassword = safe?.hasPassword ?? false;
  const setupCompletedAt = safe?.setupCompletedAt ?? null;
  const setupDone = setupCompletedAt !== null;

  const [desiredMode, setDesiredMode] = useState<AuthMode>(currentMode);
  const [logLevel, setLogLevel] = useState<LogLevel>(
    (safe?.logLevel as LogLevel) ?? "info",
  );

  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [totp, setTotp] = useState<TotpInitResponse | null>(null);
  const [totpToken, setTotpToken] = useState("");
  const [totpConfirmed, setTotpConfirmed] = useState(false);

  const [setupMode, setSetupMode] = useState<AuthMode>(currentMode);
  const [setupLogLevel, setSetupLogLevel] = useState<LogLevel>("info");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupPassword2, setSetupPassword2] = useState("");
  const [setupTotpSecret, setSetupTotpSecret] = useState("JBSWY3DPEHPK3PXP");
  const [totpNow, setTotpNow] = useState(() => Date.now());

  const setupNeedsPassword = needsPassword(setupMode);
  const setupNeedsTotp = needsTotp(setupMode);

  const wantPassword = needsPassword(desiredMode);
  const wantTotp = needsTotp(desiredMode);

  const totpAlreadyEnabled = useMemo(
    () => modeHasTotp(currentMode),
    [currentMode],
  );
  const isChangingPassword = newPassword.length > 0 || newPassword2.length > 0;

  const canSaveMode =
    (!wantTotp || totpAlreadyEnabled || totpConfirmed) &&
    (!wantPassword || hasPassword || isChangingPassword);

  useEffect(() => {
    if (!totp || totpConfirmed) return;

    const t = window.setInterval(() => {
      setTotpNow(Date.now());
    }, 250);

    return () => window.clearInterval(t);
  }, [totp, totpConfirmed]);

  const totpExpiresInSec = useMemo(() => {
    if (!totp?.expiresAt) return null;
    const ms = Date.parse(totp.expiresAt) - totpNow;
    return Math.max(0, Math.ceil(ms / 1000));
  }, [totp?.expiresAt, totpNow]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        authMode: desiredMode,
        logLevel,
      };

      // === PASSWORD RULES (sem exigir sempre)
      const isChangingPassword =
        newPassword.length > 0 || newPassword2.length > 0;

      if (wantPassword) {
        // Se usuário tentou trocar senha, valida e envia
        if (isChangingPassword) {
          if (newPassword !== newPassword2) {
            throw new Error("As senhas não conferem.");
          }
          if (newPassword.length < 8) {
            throw new Error("Senha precisa ter pelo menos 8 caracteres.");
          }
          body.adminPassword = newPassword;
        } else {
          // Se modo precisa de senha, mas ainda não existe senha no backend, obriga
          if (!hasPassword) {
            throw new Error(
              "Defina uma senha (mínimo 8 caracteres) para este modo.",
            );
          }
          // Caso contrário, mantém a senha atual (não manda adminPassword)
        }
      }

      return updateSettings(body);
    },
    onSuccess: async () => {
      toast.success("Configurações salvas.", "Settings");

      // Atualiza estado global
      await qc.invalidateQueries({ queryKey: ["settings", "safe"] });
      await qc.invalidateQueries({ queryKey: ["auth", "status"] });

      // ✅ Se for modo "somente senha", desloga completamente
      if (desiredMode === "password") {
        try {
          await logout();
        } catch {
          // ok: mesmo se falhar, força o fluxo a relogar
        } finally {
          // limpar cache ajuda a evitar UI “meio logada”
          qc.removeQueries({ queryKey: ["auth", "me"] });
          nav("/login", { replace: true });
        }
      }
    },
    onError: (e: any) =>
      toast.error(e?.message ?? "Erro ao salvar", "Settings"),
  });

  const totpInitMutation = useMutation({
    mutationFn: async () => totpInit({ label: "DockSentinel" }),
    onSuccess: (resp) => {
      setTotp(resp);
      setTotpToken("");
      setTotpConfirmed(false);
      toast.info("TOTP iniciado. Escaneie e confirme.", "TOTP");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha no init", "TOTP"),
  });

  const totpConfirmMutation = useMutation({
    mutationFn: async () => {
      if (!totp) throw new Error("Inicie o TOTP primeiro.");
      return totpConfirm({ challengeId: totp.challengeId, token: totpToken });
    },
    onSuccess: (resp) => {
      if (!resp.ok) {
        toast.error("Resposta inesperada do confirm.", "TOTP");
        return;
      }

      setTotpConfirmed(true);
      toast.success(
        `TOTP confirmado (authMode final: ${resp.authMode}).`,
        "TOTP",
      );

      // ✅ Para totp ou both: ao confirmar, já salva automaticamente
      if (desiredMode === "totp" || desiredMode === "both") {
        // Dispara o save usando a mesma lógica (authMode/logLevel/senha se preciso)
        saveMutation.mutate();
      }
    },

    onError: (e: any) =>
      toast.error(e?.message ?? "Falha ao confirmar", "TOTP"),
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const body: any = { authMode: setupMode, logLevel: setupLogLevel };

      if (setupNeedsPassword) {
        if (setupPassword !== setupPassword2)
          throw new Error("As senhas não conferem.");
        if (setupPassword.length < 8)
          throw new Error("Senha precisa ter pelo menos 8 caracteres.");
        body.adminPassword = setupPassword;
      }

      if (setupNeedsTotp) {
        if (!setupTotpSecret.trim()) {
          throw new Error("totpSecret é obrigatório para modos totp/both.");
        }
        body.totpSecret = setupTotpSecret.trim();
      }

      // ✅ usa sua função já existente
      return runSetup(body);
    },
    onSuccess: () => {
      toast.success("Setup concluído.", "Setup");
      qc.invalidateQueries({ queryKey: ["settings", "safe"] });
      qc.invalidateQueries({ queryKey: ["auth", "status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha no setup", "Setup"),
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-gray-600">
          Troque modo de login, log level e configure TOTP quando necessário.
        </p>
      </div>

      {(statusQuery.isLoading || settingsQuery.isLoading) && (
        <Card className="px-4 py-3">
          <div className="text-sm text-gray-600">Carregando...</div>
        </Card>
      )}

      {(statusQuery.isError || settingsQuery.isError) && (
        <Card className="border-red-200 bg-red-50 px-4 py-3">
          <div className="text-sm text-red-700">
            Erro ao carregar:{" "}
            {(statusQuery.error as any)?.message ||
              (settingsQuery.error as any)?.message ||
              "desconhecido"}
          </div>
        </Card>
      )}

      {safe && !setupDone && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <CardHeader
            title="Setup inicial obrigatório"
            subtitle="Você precisa executar /setup pelo menos uma vez para habilitar autenticação/configurações."
          />

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">
                Auth mode (setup)
              </div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                value={setupMode}
                onChange={(e) => setSetupMode(e.target.value as AuthMode)}
              >
                <option value="none">none</option>
                <option value="password">password</option>
                <option value="totp">totp</option>
                <option value="both">both</option>
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">
                Log level (setup)
              </div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                value={setupLogLevel}
                onChange={(e) => setSetupLogLevel(e.target.value as LogLevel)}
              >
                <option value="error">error</option>
                <option value="warn">warn</option>
                <option value="info">info</option>
                <option value="debug">debug</option>
              </select>
            </label>

            {setupNeedsPassword && (
              <div className="md:col-span-2 grid gap-2">
                <div className="text-sm font-medium text-gray-700">
                  Senha admin (setup)
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded-md border px-3 py-2 text-sm bg-white"
                    type="password"
                    placeholder="Senha admin"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                  />
                  <input
                    className="rounded-md border px-3 py-2 text-sm bg-white"
                    type="password"
                    placeholder="Confirmar senha admin"
                    value={setupPassword2}
                    onChange={(e) => setSetupPassword2(e.target.value)}
                  />
                </div>
              </div>
            )}

            {setupNeedsTotp && (
              <div className="md:col-span-2 grid gap-2">
                <div className="text-sm font-medium text-gray-700">
                  totpSecret (setup)
                </div>
                <input
                  className="rounded-md border px-3 py-2 text-sm font-mono bg-white"
                  value={setupTotpSecret}
                  onChange={(e) => setSetupTotpSecret(e.target.value)}
                  placeholder="JBSWY3DPEHPK3PXP"
                />
                <div className="text-xs text-gray-600">
                  Obrigatório para <span className="font-mono">totp</span> e{" "}
                  <span className="font-mono">both</span>.
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <Button
              variant="primary"
              type="button"
              onClick={() => setupMutation.mutate()}
              disabled={setupMutation.isPending}
            >
              Executar setup
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <CardHeader
          title="Autenticação"
          subtitle={
            <>
              Modo atual: <Badge tone="gray">{currentMode}</Badge>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <div className="text-sm font-medium text-gray-700">Auth mode</div>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={desiredMode}
              onChange={(e) => setDesiredMode(e.target.value as AuthMode)}
            >
              <option value="none">none</option>
              <option value="password">password</option>
              <option value="totp">totp</option>
              <option value="both">both</option>
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium text-gray-700">Log level</div>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value as LogLevel)}
            >
              <option value="error">error</option>
              <option value="warn">warn</option>
              <option value="info">info</option>
              <option value="debug">debug</option>
            </select>
          </label>

          {wantPassword && (
            <div className="md:col-span-2 grid gap-2">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-gray-700">
                  Definir/alterar senha
                </div>
                <Badge tone="gray">min 8</Badge>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <input
                  className="rounded-md border px-3 py-2 text-sm"
                  type="password"
                  placeholder="Nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <input
                  className="rounded-md border px-3 py-2 text-sm"
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                />
              </div>

              <div className="text-xs text-gray-500">
                Se você não preencher, o backend pode manter a senha atual
                (dependendo da implementação). Para troca garantida, preencha.
              </div>
            </div>
          )}
        </div>

        {wantTotp && !totpAlreadyEnabled && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-gray-700">
                Ativar TOTP (obrigatório para {desiredMode})
              </div>
              <Button
                type="button"
                onClick={() => totpInitMutation.mutate()}
                disabled={totpInitMutation.isPending}
              >
                Iniciar TOTP
              </Button>
            </div>

            {totp && (
              <div className="mt-3 grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="flex items-center justify-center rounded-lg border bg-white p-3">
                  <QRCodeSVG value={totp.otpauthUrl} size={180} />
                </div>

                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="text-gray-600">Secret</div>
                    <div className="font-mono">{totp.secret}</div>
                  </div>
                  {totpExpiresInSec !== null && (
                    <div className="text-sm">
                      <div className="text-gray-600">Expira em</div>
                      <div className="font-mono">
                        {totpExpiresInSec}s
                        {totpExpiresInSec === 0 && (
                          <span className="ml-2 text-red-600">
                            Expirado — inicie novamente.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <label className="space-y-1 block">
                    <div className="text-sm font-medium text-gray-700">
                      Token (6 dígitos)
                    </div>
                    <input
                      className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                      value={totpToken}
                      onChange={(e) => setTotpToken(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                    />
                  </label>

                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      type="button"
                      onClick={() => totpConfirmMutation.mutate()}
                      disabled={
                        totpConfirmMutation.isPending || totpExpiresInSec === 0
                      }
                    >
                      Confirmar
                    </Button>
                    {totpConfirmed && <Badge tone="green">Confirmado</Badge>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            variant="primary"
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !canSaveMode}
            title={
              !canSaveMode ? "Complete TOTP/senha antes de salvar." : undefined
            }
          >
            Salvar
          </Button>
        </div>
      </Card>
    </div>
  );
}
