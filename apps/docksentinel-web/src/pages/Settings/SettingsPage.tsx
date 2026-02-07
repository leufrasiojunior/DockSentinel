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
import { getSettings, updateSettings, type SafeSettings } from "../../api/settings";
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

type SetupWizard =
  | { step: "setup"; mode: AuthMode; logLevel: LogLevel; adminPassword?: string }
  | { step: "totp"; mode: AuthMode; logLevel: LogLevel; adminPassword?: string }
  | { step: "done" };

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

  const setupCompletedAt = safe?.setupCompletedAt ?? null;
  const setupDone = setupCompletedAt !== null;

  const hasPassword = safe?.hasPassword ?? false;
  const hasTotp = safe?.hasTotp ?? false;

  // ======= Normal settings state =======
  const [desiredMode, setDesiredMode] = useState<AuthMode>(currentMode);
  const [logLevel, setLogLevel] = useState<LogLevel>((safe?.logLevel as LogLevel) ?? "info");

  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [totp, setTotp] = useState<TotpInitResponse | null>(null);
  const [totpToken, setTotpToken] = useState("");
  const [totpConfirmed, setTotpConfirmed] = useState(false);

  const [totpNow, setTotpNow] = useState(() => Date.now());

  // ======= Setup wizard state =======
  const [setupMode, setSetupMode] = useState<AuthMode>(currentMode);
  const [setupLogLevel, setSetupLogLevel] = useState<LogLevel>("info");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupPassword2, setSetupPassword2] = useState("");
  const [setupTotpSecret, setSetupTotpSecret] = useState("JBSWY3DPEHPK3PXP");

  const [wizard, setWizard] = useState<SetupWizard>({ step: "setup", mode: "none", logLevel: "info" });

  // Ajusta o wizard automaticamente quando os dados carregarem
  useEffect(() => {
    if (!safe) return;

    // Se setup ainda não foi feito: força wizard em "setup"
    if (safe.setupCompletedAt === null) {
      setWizard({ step: "setup", mode: setupMode, logLevel: setupLogLevel });
      return;
    }

    // Se setup foi feito, mas wizard estava ativo, preserva
    // (a gente controla a transição via setWizard no onSuccess do setup)
  }, [safe]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sincroniza defaults quando carregar status/settings
  useEffect(() => {
    if (!statusQuery.data) return;
    setDesiredMode((statusQuery.data.authMode ?? "none") as AuthMode);
    setSetupMode((statusQuery.data.authMode ?? "none") as AuthMode);
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

  // ======= TOTP countdown =======
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

  // ======= Confirm text based on current mode =======
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

  // ======= Normal settings save =======
  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = { authMode: desiredMode, logLevel };

      // Senha: só exige se necessário
      if (wantPassword) {
        if (isChangingPassword) {
          if (newPassword !== newPassword2) throw new Error("As senhas não conferem.");
          if (newPassword.length < 8) throw new Error("Senha precisa ter pelo menos 8 caracteres.");
          body.adminPassword = newPassword;
        } else {
          // Se não existe senha no backend, obriga definir uma agora
          if (!hasPassword) {
            throw new Error("Defina uma senha (mínimo 8 caracteres) para este modo.");
          }
        }
      }

      // TOTP: se quer totp/both e não tem totp confirmado/ativo, bloqueia
      if (wantTotp && !(totpActuallyEnabled || totpConfirmed)) {
        throw new Error("Configure e confirme o TOTP antes de salvar este modo.");
      }

      return updateSettings(body);
    },
    onSuccess: async () => {
      toast.success("Configurações salvas.", "Settings");
      await qc.invalidateQueries({ queryKey: ["settings", "safe"] });
      await qc.invalidateQueries({ queryKey: ["auth", "status"] });

      // ✅ regra: se modo final for somente senha, desloga
      if (desiredMode === "password") {
        try {
          await logout();
        } catch {
          // ok
        } finally {
          qc.removeQueries({ queryKey: ["auth", "me"] });
          nav("/login", { replace: true });
        }
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar", "Settings"),
  });

  async function handleSaveClicked() {
    // Se está mudando modo (inclui ir para none), pede confirmação conforme o modo atual
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

    saveMutation.mutate();
  }

  // ======= TOTP init (shared) =======
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

  // ======= Normal TOTP confirm (auto-save for totp/both) =======
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

      // ✅ regra: para totp/both, ao confirmar já salva automaticamente (modo normal)
      if (setupDone && (desiredMode === "totp" || desiredMode === "both")) {
        saveMutation.mutate();
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao confirmar", "TOTP"),
  });

  // ======= Setup mutation =======
  const setupNeedsPassword = needsPassword(setupMode);
  const setupNeedsTotp = needsTotp(setupMode);

  const setupMutation = useMutation({
    mutationFn: async () => {
      const body: any = { authMode: setupMode, logLevel: setupLogLevel };

      if (setupNeedsPassword) {
        if (setupPassword !== setupPassword2) throw new Error("As senhas não conferem.");
        if (setupPassword.length < 8) throw new Error("Senha precisa ter pelo menos 8 caracteres.");
        body.adminPassword = setupPassword;
      }

      // ✅ regra do backend: totpSecret é obrigatório para totp/both, mas pode ser qualquer coisa
      if (setupNeedsTotp) {
        const s = setupTotpSecret.trim();
        if (!s) throw new Error("totpSecret é obrigatório para modos totp/both.");
        body.totpSecret = s;
      }

      return runSetup(body);
    },
    onSuccess: async () => {
      toast.success("Setup concluído.", "Setup");
      await qc.invalidateQueries({ queryKey: ["settings", "safe"] });
      await qc.invalidateQueries({ queryKey: ["auth", "status"] });

      // Se setup escolheu totp/both, agora vamos para a etapa "Configurar TOTP"
      if (setupMode === "totp" || setupMode === "both") {
        setWizard({
          step: "totp",
          mode: setupMode,
          logLevel: setupLogLevel,
          adminPassword: setupNeedsPassword ? setupPassword : undefined,
        });
        return;
      }

      // Se for password ou none: termina wizard
      setWizard({ step: "done" });

      // Se mode ficou diferente de none, manda pro login (porque a partir daqui pode exigir credencial)
      if (setupMode !== "none") {
        nav("/login", { replace: true });
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha no setup", "Setup"),
  });

  // ======= Setup-TOTP confirm (only in wizard totp step) =======
  const setupTotpConfirmMutation = useMutation({
    mutationFn: async () => {
      if (!totp) throw new Error("Inicie o TOTP primeiro.");
      return totpConfirm({ challengeId: totp.challengeId, token: totpToken });
    },
    onSuccess: async (resp) => {
      if (!resp.ok) {
        toast.error("Resposta inesperada do confirm.", "TOTP");
        return;
      }

      toast.success("TOTP confirmado. Finalizando setup...", "TOTP");

      // ✅ Somente agora: salva authMode final e desloga
      try {
        await updateSettings({
          authMode: wizard.step === "totp" ? wizard.mode : setupMode,
          logLevel: wizard.step === "totp" ? wizard.logLevel : setupLogLevel,
          ...(wizard.step === "totp" && wizard.adminPassword
            ? { adminPassword: wizard.adminPassword }
            : {}),
        });

        await qc.invalidateQueries({ queryKey: ["settings", "safe"] });
        await qc.invalidateQueries({ queryKey: ["auth", "status"] });

        toast.success("Configuração concluída. Faça login novamente.", "Setup");

        try {
          await logout();
        } catch {
          // ok
        } finally {
          qc.removeQueries({ queryKey: ["auth", "me"] });
          nav("/login", { replace: true });
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Falha ao finalizar configuração", "Setup");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao confirmar", "TOTP"),
  });

  // ======= RENDER =======
  const loading = statusQuery.isLoading || settingsQuery.isLoading;
  const hasError = statusQuery.isError || settingsQuery.isError;

  // Decide quando mostrar wizard
  const showSetupWizard = safe && !setupDone;
  const showTotpWizard = wizard.step === "totp";

  // Se setup ainda não foi feito, sempre força wizard “setup”
  useEffect(() => {
    if (!safe) return;
    if (safe.setupCompletedAt === null) {
      setWizard({ step: "setup", mode: setupMode, logLevel: setupLogLevel });
    }
  }, [safe, setupMode, setupLogLevel]);

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
            {(statusQuery.error as any)?.message ||
              (settingsQuery.error as any)?.message ||
              "desconhecido"}
          </div>
        </Card>
      )}

      {/* ===== Setup wizard (obrigatório antes de tudo) ===== */}
      {showSetupWizard && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <CardHeader
            title="Setup inicial obrigatório"
            subtitle="Você precisa executar /setup pelo menos uma vez."
          />

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Auth mode (setup)</div>
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
              <div className="text-sm font-medium text-gray-700">Log level (setup)</div>
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
                <div className="text-sm font-medium text-gray-700">Senha admin (setup)</div>
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
                <div className="text-xs text-gray-600">
                  Obrigatório para <span className="font-mono">password</span> e{" "}
                  <span className="font-mono">both</span>.
                </div>
              </div>
            )}

            {setupNeedsTotp && (
              <div className="md:col-span-2 grid gap-2">
                <div className="text-sm font-medium text-gray-700">totpSecret (setup)</div>
                <input
                  className="rounded-md border px-3 py-2 text-sm font-mono bg-white"
                  value={setupTotpSecret}
                  onChange={(e) => setSetupTotpSecret(e.target.value)}
                  placeholder="JBSWY3DPEHPK3PXP"
                />
                <div className="text-xs text-gray-600">
                  O backend exige isso para <span className="font-mono">totp</span> e{" "}
                  <span className="font-mono">both</span>. Pode ser qualquer valor por enquanto.
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

      {/* ===== TOTP wizard (após setup, se modo inicial pediu TOTP) ===== */}
      {!showSetupWizard && showTotpWizard && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <CardHeader
            title="Configurar TOTP"
            subtitle="Obrigatório para finalizar o modo escolhido no setup."
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-sm text-gray-700">
              Modo escolhido no setup: <Badge tone="gray">{wizard.mode}</Badge>
            </div>
            <Button
              type="button"
              onClick={() => totpInitMutation.mutate()}
              disabled={totpInitMutation.isPending}
            >
              Configurar TOTP
            </Button>
          </div>

          {totp && (
            <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
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
                  <div className="text-sm font-medium text-gray-700">Token (6 dígitos)</div>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm font-mono bg-white"
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
                    onClick={() => setupTotpConfirmMutation.mutate()}
                    disabled={setupTotpConfirmMutation.isPending || totpExpiresInSec === 0}
                  >
                    Confirmar
                  </Button>
                </div>

                <div className="text-xs text-gray-600">
                  Ao confirmar com sucesso, o sistema finaliza a configuração e te desloga para você entrar novamente.
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ===== Normal settings (somente quando setup já existe e não está no wizard do TOTP) ===== */}
      {safe && setupDone && !showTotpWizard && (
        <Card className="p-4">
          <CardHeader
            title="Autenticação"
            subtitle={
              <>
                Modo atual: <Badge tone="gray">{currentMode}</Badge>
                {safe.setupCompletedAt && (
                  <span className="ml-2 text-xs text-gray-500">
                    setup: {new Date(safe.setupCompletedAt).toLocaleString()}
                  </span>
                )}
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
                  // reset “flow” de TOTP quando troca modo
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

          {/* TOTP config no modo normal: só aparece se desejado e ainda não existe TOTP */}
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
                            <span className="ml-2 text-red-600">
                              Expirado — inicie novamente.
                            </span>
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
