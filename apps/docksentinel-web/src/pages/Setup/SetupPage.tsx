// src/pages/Setup/SetupPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardHeader } from "../../layouts/ui/Card";
import { Button } from "../../layouts/ui/Button";
import { Badge } from "../../layouts/ui/Badge";
import { useToast } from "../../layouts/ui/ToastProvider";
import { ApiError } from "../../api/http";
import { runSetup, type SetupDto, type LogLevel } from "../../api/setup";
import { getAuthStatus, type AuthMode } from "../../api/auth";
import { totpConfirm, totpInit, type TotpInitResponse } from "../../api/totp";
import { QRCodeSVG } from "qrcode.react";

const AUTH_MODES: { value: AuthMode; label: string; desc: string }[] = [
  { value: "none", label: "none", desc: "Sem solicitação de login" },
  { value: "password", label: "password", desc: "Somente senha" },
  { value: "totp", label: "totp", desc: "Somente TOTP (2FA)" },
  { value: "both", label: "both", desc: "Senha + TOTP (2FA)" },
];

const LOG_LEVELS: { value: LogLevel; label: string }[] = [
  { value: "error", label: "error" },
  { value: "warn", label: "warn" },
  { value: "info", label: "info" },
  { value: "debug", label: "debug" },
];

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function SetupPage() {
  const nav = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(false);

  // etapa: setup -> totp-init -> totp-confirm
  const [stage, setStage] = useState<"setup" | "totp">("setup");

  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [logLevel, setLogLevel] = useState<LogLevel>("info");
  const [adminPassword, setAdminPassword] = useState("");
  const [totpSecret, setTotpSecret] = useState("JBSWY3DPEHPK3PXP");

  const [totpInfo, setTotpInfo] = useState<TotpInitResponse | null>(null);
  const [totpToken, setTotpToken] = useState("");
  const [now, setNow] = useState(Date.now());



  // relógio do countdown
  useEffect(() => {
    if (stage !== "totp" || !totpInfo) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [stage, totpInfo]);

  const needsPassword = authMode === "password" || authMode === "both";
  const needsTotp = authMode === "totp" || authMode === "both";

  const expiresInMs = useMemo(() => {
    if (!totpInfo) return 0;
    const exp = new Date(totpInfo.expiresAt).getTime();
    console.log("TOTP expires at", totpInfo.expiresAt, "=", exp);
    return exp - now;
  }, [totpInfo, now]);

  async function handleRunSetup() {
    if (loading) return;
    setLoading(true);

    try {
      const body: SetupDto = {
        authMode,
        logLevel,
        adminPassword: needsPassword ? adminPassword : undefined,
        totpSecret: needsTotp ? totpSecret : undefined,
      };

      // validações básicas do lado do front (sem travar o back)
      if (needsPassword && adminPassword.trim().length < 8) {
        toast.error("Senha admin precisa ter pelo menos 8 caracteres.", "Setup");
        setLoading(false);
        return;
      }
      if (needsTotp && totpSecret.trim().length < 16) {
        toast.error("totpSecret precisa ter pelo menos 16 caracteres.", "Setup");
        setLoading(false);
        return;
      }

      try {
        await runSetup(body);
        toast.success("Setup aplicado com sucesso.", "Setup");
      } catch (e: any) {
        // 409 = já configurado, seguimos o fluxo sem quebrar
        const err = e as ApiError;
        if (err?.status === 409) {
          toast.info("Setup já estava concluído. Continuando...", "Setup");
        } else {
          throw e;
        }
      }

      // Se modo inclui TOTP, inicia o desafio e vai pra etapa 2
      if (needsTotp) {
        const init = await totpInit({ label: "DockSentinel" });
        setTotpInfo(init);
        setStage("totp");
        toast.info("Escaneie o QR e confirme o token.", "TOTP");
      } else {
        // se não tem totp, manda pro login (ou dashboard se mode none)
        const st = await getAuthStatus();
        if (st.authMode === "none") nav("/dashboard", { replace: true });
        else nav("/login", { replace: true });
      }
    } catch (e: any) {
      const msg = e?.message ?? "Falha ao executar setup";
      toast.error(msg, "Setup");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmTotp() {
    if (loading || !totpInfo) return;
    setLoading(true);

    try {
      const token = totpToken.trim();
      if (token.length !== 6) {
        toast.error("Token TOTP deve ter 6 dígitos.", "TOTP");
        setLoading(false);
        return;
      }

      const resp = await totpConfirm({
        challengeId: totpInfo.challengeId,
        token,
      });

      if (resp.ok) {
        toast.success(`TOTP confirmado. authMode=${resp.authMode}`, "TOTP");
        nav("/login", { replace: true });
      } else {
        toast.error("Falha ao confirmar TOTP.", "TOTP");
      }
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao confirmar TOTP";
      toast.error(msg, "TOTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Setup</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure o modo de autenticação e finalize o TOTP (se aplicável).
          </p>
        </div>
        

        {stage === "setup" && (
          <Card className="p-4">
            <CardHeader
              title="Configuração inicial"
              subtitle="Esta rota é usada para setup inicial (pode retornar 409 se já estiver feito)."
            />

            <div className="mt-4 grid gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Auth mode
                </label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {AUTH_MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setAuthMode(m.value)}
                      className={[
                        "rounded-xl border p-3 text-left transition",
                        authMode === m.value
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-gray-200 bg-white hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{m.label}</div>
                        {authMode === m.value && <Badge tone="green">selecionado</Badge>}
                      </div>
                      <div
                        className={[
                          "mt-1 text-xs",
                          authMode === m.value ? "text-white/80" : "text-gray-600",
                        ].join(" ")}
                      >
                        {m.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Log level
                </label>
                <select
                  className="mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value as LogLevel)}
                >
                  {LOG_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {needsPassword && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Admin password
                  </label>
                  <input
                    className="mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    type="password"
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    Obrigatório quando authMode é <span className="font-mono">password</span> ou{" "}
                    <span className="font-mono">both</span>.
                  </div>
                </div>
              )}

              {needsTotp && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    TOTP secret (temporário)
                  </label>
                  <input
                    className="mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-mono"
                    value={totpSecret}
                    onChange={(e) => setTotpSecret(e.target.value)}
                    placeholder="Base32, min 16 chars"
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    Você disse que vai remover essa exigência depois — por enquanto mantemos.
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleRunSetup}
                  disabled={loading}
                  type="button"
                >
                  Aplicar setup
                </Button>
                <Button
                  onClick={() => nav("/login")}
                  disabled={loading}
                  type="button"
                >
                  Voltar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {stage === "totp" && totpInfo && (
          <Card className="p-4">
            <CardHeader
              title="Ativação do TOTP"
              subtitle="Escaneie o QR e confirme o token antes do login."
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-semibold">QR Code</div>
                <div className="mt-3 flex items-center justify-center">
                  <QRCodeSVG value={totpInfo.otpauthUrl} size={180} />
                </div>

                <div className="mt-3 text-xs text-gray-600">
                  Expira em:{" "}
                  <span className={expiresInMs <= 0 ? "text-red-600 font-semibold" : "font-semibold"}>
                    {formatMs(expiresInMs)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold">Secret (fallback)</div>
                  <div className="mt-2 rounded-md bg-gray-50 p-2 font-mono text-xs break-all">
                    {totpInfo.secret}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold">challengeId</div>
                  <div className="mt-2 rounded-md bg-gray-50 p-2 font-mono text-xs break-all">
                    {totpInfo.challengeId}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Token TOTP (6 dígitos)
                  </label>
                  <input
                    className="mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-mono"
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value)}
                    placeholder="123456"
                    inputMode="numeric"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={handleConfirmTotp}
                    disabled={loading || expiresInMs <= 0}
                    type="button"
                    title={expiresInMs <= 0 ? "Desafio expirou, volte e gere outro." : undefined}
                  >
                    Confirmar
                  </Button>

                  <Button
                    onClick={() => {
                      setStage("setup");
                      setTotpInfo(null);
                      setTotpToken("");
                    }}
                    disabled={loading}
                    type="button"
                  >
                    Voltar
                  </Button>
                </div>

                {expiresInMs <= 0 && (
                  <div className="text-xs text-red-600">
                    Desafio expirou. Volte e gere um novo <span className="font-mono">/settings/totp/init</span>.
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
