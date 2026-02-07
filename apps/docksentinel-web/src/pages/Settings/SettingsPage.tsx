import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";

import { Card, CardHeader } from "../../layouts/ui/Card";
import { Button } from "../../layouts/ui/Button";
import { Badge } from "../../layouts/ui/Badge";
import { useToast } from "../../layouts/ui/ToastProvider";
import { useConfirm } from "../../layouts/ui/ConfirmProvider";

import { getAuthStatus, logout, type AuthMode } from "../../api/auth";
import {
  getSettings,
  updateSettings,
  type LogLevel,
  type SafeSettings,
  type UpdateSettingsBody,
} from "../../api/settings";
import { totpInit, totpConfirm, type TotpInitResponse } from "../../api/totp";

function needsPassword(mode: AuthMode) {
  return mode === "password" || mode === "both";
}

function needsTotp(mode: AuthMode) {
  return mode === "totp" || mode === "both";
}

function modeHasTotp(mode: AuthMode) {
  return mode === "totp" || mode === "both";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "n/a";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return value;
  return new Date(ts).toLocaleString();
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

export function SettingsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const qc = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["auth", "status"],
    queryFn: getAuthStatus,
  });

  const settingsQuery = useQuery({
    queryKey: ["settings", "safe"],
    queryFn: getSettings,
  });

  const currentMode = (statusQuery.data?.authMode ?? "none") as AuthMode;
  const safe = (settingsQuery.data ?? null) as SafeSettings | null;

  const hasPassword = safe?.hasPassword ?? false;
  const hasTotp = safe?.hasTotp ?? false;

  const [desiredMode, setDesiredMode] = useState<AuthMode>(currentMode);
  const [logLevel, setLogLevel] = useState<LogLevel>((safe?.logLevel as LogLevel) ?? "info");

  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [totp, setTotp] = useState<TotpInitResponse | null>(null);
  const [totpToken, setTotpToken] = useState("");
  const [totpConfirmed, setTotpConfirmed] = useState(false);
  const [totpNow, setTotpNow] = useState(() => Date.now());

  useEffect(() => {
    if (!statusQuery.data) return;
    setDesiredMode((statusQuery.data.authMode ?? "none") as AuthMode);
  }, [statusQuery.data]);

  useEffect(() => {
    if (!safe) return;
    setLogLevel((safe.logLevel as LogLevel) ?? "info");
  }, [safe]);

  const wantPassword = needsPassword(desiredMode);
  const wantTotp = needsTotp(desiredMode);
  const totpAlreadyEnabledByMode = useMemo(() => modeHasTotp(currentMode), [currentMode]);
  const totpActuallyEnabled = hasTotp || totpAlreadyEnabledByMode;
  const isChangingPassword = newPassword.length > 0 || newPassword2.length > 0;

  const canSaveMode =
    (!wantTotp || totpActuallyEnabled || totpConfirmed) &&
    (!wantPassword || hasPassword || isChangingPassword);

  useEffect(() => {
    if (!totp || totpConfirmed) return;
    const t = window.setInterval(() => setTotpNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [totp, totpConfirmed]);

  const totpExpiresInSec = useMemo(() => {
    if (!totp?.expiresAt) return null;
    const ms = Date.parse(totp.expiresAt) - totpNow;
    return Math.max(0, Math.ceil(ms / 1000));
  }, [totp?.expiresAt, totpNow]);

  function buildChangeConfirmText() {
    if (currentMode === "none") {
      return "Você está sem login ativo. Essa alteração pode exigir login novamente.";
    }
    if (currentMode === "password") {
      return "Seu login atual é por senha. Ao salvar, você pode ser deslogado e precisará entrar novamente.";
    }
    if (currentMode === "totp") {
      return "Seu login atual é por TOTP. Ao salvar, você pode ser deslogado e precisará entrar novamente com TOTP.";
    }
    return "Seu login atual é senha + TOTP. Ao salvar, você pode ser deslogado e precisará entrar novamente.";
  }

  const saveMutation = useMutation({
    mutationFn: async (options?: { totpConfirmedOverride?: boolean }) => {
      const body: UpdateSettingsBody = { authMode: desiredMode, logLevel };

      if (wantPassword) {
        if (isChangingPassword) {
          if (newPassword !== newPassword2) throw new Error("As senhas não conferem.");
          if (newPassword.length < 8) throw new Error("Senha precisa ter pelo menos 8 caracteres.");
          body.adminPassword = newPassword;
        } else if (!hasPassword) {
          throw new Error("Defina uma senha (mínimo 8 caracteres) para este modo.");
        }
      }

      const hasEffectiveTotp =
        totpActuallyEnabled || totpConfirmed || options?.totpConfirmedOverride === true;

      if (wantTotp && !hasEffectiveTotp) {
        throw new Error("Configure e confirme o TOTP antes de salvar este modo.");
      }

      return updateSettings(body);
    },
    onSuccess: async () => {
      toast.success("Configurações salvas.", "Settings");
      await qc.invalidateQueries({ queryKey: ["settings", "safe"] });
      await qc.invalidateQueries({ queryKey: ["auth", "status"] });

      if (desiredMode === "password") {
        try {
          await logout();
        } catch {
          // ok
        } finally {
          qc.removeQueries({ queryKey: ["auth", "me"] });
          nav("/login", { replace: true });
        }
        return;
      }

      if (currentMode === "none" && desiredMode !== "none") {
        nav("/login", { replace: true });
      }
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Erro ao salvar"), "Settings"),
  });

  async function handleSaveClicked() {
    const isModeChange = desiredMode !== currentMode;
    if (isModeChange) {
      const ok = await confirm.confirm({
        title: "Confirmar alteração do modo de login?",
        description:
          buildChangeConfirmText() +
          "\n\nDica: se você perdeu o TOTP ou quer trocar a senha, pode manter o mesmo modo e apenas reconfigurar.",
        confirmText: "Continuar",
        cancelText: "Cancelar",
      });
      if (!ok) return;
    }

    saveMutation.mutate(undefined);
  }

  const totpInitMutation = useMutation({
    mutationFn: async () => totpInit({ label: "DockSentinel" }),
    onSuccess: (resp) => {
      setTotp(resp);
      setTotpToken("");
      setTotpConfirmed(false);
      toast.info("TOTP iniciado. Escaneie e confirme.", "TOTP");
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Falha no init"), "TOTP"),
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
      toast.success(`TOTP confirmado (authMode final: ${resp.authMode}).`, "TOTP");

      if (desiredMode === "totp" || desiredMode === "both") {
        saveMutation.mutate({ totpConfirmedOverride: true });
      }
    },
    onError: (error: unknown) =>
      toast.error(errorMessage(error, "Falha ao confirmar"), "TOTP"),
  });

  const loading = statusQuery.isLoading || settingsQuery.isLoading;
  const hasError = statusQuery.isError || settingsQuery.isError;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-gray-600">
          Troque modo de login, log level e configure TOTP quando necessário.
        </p>
      </div>

      {loading && (
        <Card className="px-4 py-3">
          <div className="text-sm text-gray-600">Carregando...</div>
        </Card>
      )}

      {hasError && (
        <Card className="border-red-200 bg-red-50 px-4 py-3">
          <div className="text-sm text-red-700">
            Erro ao carregar:{" "}
            {errorMessage(statusQuery.error, "") ||
              errorMessage(settingsQuery.error, "") ||
              "desconhecido"}
          </div>
        </Card>
      )}

      {safe && (
        <Card className="p-4">
          <CardHeader
            title="Autenticação"
            subtitle={
              <>
                Modo atual: <Badge tone="gray">{currentMode}</Badge>
                <span className="ml-2 text-xs text-gray-500">
                  criado: {formatDateTime(safe.createdAt)}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  atualizado: {formatDateTime(safe.updatedAt)}
                </span>
              </>
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Auth mode</div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={desiredMode}
                onChange={(e) => {
                  setDesiredMode(e.target.value as AuthMode);
                  setTotp(null);
                  setTotpToken("");
                  setTotpConfirmed(false);
                }}
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
                  <div className="text-sm font-medium text-gray-700">Definir/alterar senha</div>
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

                {!hasPassword && !isChangingPassword && (
                  <div className="text-xs text-amber-700">
                    Este modo exige senha e ainda não existe senha configurada. Defina uma senha para salvar.
                  </div>
                )}

                {hasPassword && !isChangingPassword && (
                  <div className="text-xs text-gray-500">
                    Se você não preencher, a senha atual será mantida.
                  </div>
                )}
              </div>
            )}
          </div>

          {wantTotp && !totpActuallyEnabled && (
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
                            <span className="ml-2 text-red-600">Expirado - inicie novamente.</span>
                          )}
                        </div>
                      </div>
                    )}

                    <label className="space-y-1 block">
                      <div className="text-sm font-medium text-gray-700">Token (6 dígitos)</div>
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
                        disabled={totpConfirmMutation.isPending || totpExpiresInSec === 0}
                      >
                        Confirmar
                      </Button>
                      {totpConfirmed && <Badge tone="green">Confirmado</Badge>}
                    </div>

                    <div className="text-xs text-gray-600">
                      Ao confirmar com sucesso, o modo <span className="font-mono">{desiredMode}</span> será salvo automaticamente.
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
              onClick={handleSaveClicked}
              disabled={saveMutation.isPending || !canSaveMode}
              title={!canSaveMode ? "Complete TOTP/senha antes de salvar." : undefined}
            >
              Salvar
            </Button>

            {saveMutation.isPending && (
              <span className="text-sm text-gray-600 self-center">Salvando...</span>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
