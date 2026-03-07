import { QRCodeSVG } from "qrcode.react";
import { CardHeader } from "../../../shared/components/ui/Card";
import { Button } from "../../../shared/components/ui/Button";
import { Badge } from "../../../shared/components/ui/Badge";
import { type AuthMode } from "../../auth/api/auth";
import { type LogLevel, type SafeSettings } from "../api/settings";
import { useTotp } from "../../auth/hooks/useTotp";

interface AuthSettingsProps {
  safe: SafeSettings;
  currentMode: AuthMode;
  desiredMode: AuthMode;
  setDesiredMode: (mode: AuthMode) => void;
  logLevel: LogLevel;
  setLogLevel: (level: LogLevel) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  newPassword2: string;
  setNewPassword2: (v: string) => void;
  onSave: (options?: { totpConfirmedOverride?: boolean }) => void;
  isSaving: boolean;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "n/a";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return value;
  return new Date(ts).toLocaleString();
}

export function AuthSettings({
  safe,
  currentMode,
  desiredMode,
  setDesiredMode,
  logLevel,
  setLogLevel,
  newPassword,
  setNewPassword,
  newPassword2,
  setNewPassword2,
  onSave,
  isSaving,
}: AuthSettingsProps) {
  const {
    totp,
    setTotp,
    totpToken,
    setTotpToken,
    totpConfirmed,
    totpExpiresInSec,
    initMutation,
    confirmMutation,
  } = useTotp();

  const wantPassword = desiredMode === "password" || desiredMode === "both";
  const wantTotp = desiredMode === "totp" || desiredMode === "both";
  const totpActuallyEnabled = safe.hasTotp || currentMode === "totp" || currentMode === "both";
  const isChangingPassword = newPassword.length > 0 || newPassword2.length > 0;

  const canSave =
    (!wantTotp || totpActuallyEnabled || totpConfirmed) &&
    (!wantPassword || safe.hasPassword || isChangingPassword);

  const handleSave = () => {
    onSave({ totpConfirmedOverride: totpConfirmed });
  };

  return (
    <div className="space-y-4">
      <CardHeader
        title="Autenticação"
        subtitle={
          <>
            Modo atual: <Badge tone="gray">{currentMode}</Badge>
            <span className="ml-2 text-xs text-gray-500">criado: {formatDateTime(safe.createdAt)}</span>
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
            }}
          >
            <option value="none"> Sem senha</option>
            <option value="password">Somente senha</option>
            <option value="totp">TOTP</option>
            <option value="both">Ambos (Senha + TOTP)</option>
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

            {!safe.hasPassword && !isChangingPassword && (
              <div className="text-xs text-amber-700">
                Este modo exige senha e ainda não existe senha configurada. Defina uma senha para salvar.
              </div>
            )}

            {safe.hasPassword && !isChangingPassword && (
              <div className="text-xs text-gray-500">Se você não preencher, a senha atual será mantida.</div>
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
              onClick={() => initMutation.mutate()}
              disabled={initMutation.isPending}
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
                  <button
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    type="button"
                    onClick={() => confirmMutation.mutate()}
                    disabled={confirmMutation.isPending || totpExpiresInSec === 0}
                  >
                    Confirmar
                  </button>
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
          onClick={handleSave}
          disabled={isSaving || !canSave}
          title={!canSave ? "Complete TOTP/senha antes de salvar." : undefined}
        >
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
