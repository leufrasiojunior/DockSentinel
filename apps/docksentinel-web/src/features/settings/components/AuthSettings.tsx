import { QRCodeSVG } from "qrcode.react";
import { KeyRound, ShieldCheck, ShieldEllipsis } from "lucide-react";

import { FormField } from "../../../components/product/form-field";
import { SectionCard } from "../../../components/product/section-card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { type AuthMode } from "../../auth/api/auth";
import { useTotp } from "../../auth/hooks/useTotp";
import { type SafeSettings, type LogLevel } from "../api/settings";

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
    <SectionCard
      title="Auth & access"
      description={
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">modo atual: {currentMode}</Badge>
          <Badge variant="outline">criado: {formatDateTime(safe.createdAt)}</Badge>
          <Badge variant="outline">atualizado: {formatDateTime(safe.updatedAt)}</Badge>
        </span>
      }
      actions={
        <Button
          variant="primary"
          type="button"
          onClick={handleSave}
          disabled={isSaving || !canSave}
          title={!canSave ? "Complete TOTP/senha antes de salvar." : undefined}
        >
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Auth mode" description="Define o método exigido para entrar no painel.">
          <Select
            value={desiredMode}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setDesiredMode(e.target.value as AuthMode);
              setTotp(null);
            }}
          >
            <option value="none">Sem senha</option>
            <option value="password">Somente senha</option>
            <option value="totp">TOTP</option>
            <option value="both">Ambos (Senha + TOTP)</option>
          </Select>
        </FormField>

        <FormField label="Log level" description="Controla o nível de verbosidade exposto pelo backend.">
          <Select
            value={logLevel}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLogLevel(e.target.value as LogLevel)}
          >
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
            <option value="debug">debug</option>
          </Select>
        </FormField>

        {wantPassword ? (
          <Card className="border-border/60 bg-muted/20 p-5 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border/60 bg-card p-3">
                <KeyRound className="size-4.5 text-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Senha administrativa</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {safe.hasPassword
                    ? "Se você não preencher os campos abaixo, a senha atual será mantida."
                    : "Este modo exige uma senha nova com no mínimo 8 caracteres."}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FormField label="Nova senha" description="Obrigatória apenas quando ainda não existe senha cadastrada.">
                <Input
                  type="password"
                  placeholder="Nova senha"
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                />
              </FormField>

              <FormField label="Confirmar senha" description="Repita a senha para validar a alteração.">
                <Input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={newPassword2}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword2(e.target.value)}
                />
              </FormField>
            </div>

            {!safe.hasPassword && !isChangingPassword ? (
              <div className="mt-4 text-sm font-medium text-amber-700 dark:text-amber-300">
                Este modo exige senha e ainda não existe senha configurada.
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>

      {wantTotp ? (
        <Card className="border-border/60 bg-muted/20 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border/60 bg-card p-3">
                  {totpActuallyEnabled ? (
                    <ShieldCheck className="size-4.5 text-foreground" />
                  ) : (
                    <ShieldEllipsis className="size-4.5 text-foreground" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">TOTP</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {totpActuallyEnabled
                      ? "TOTP já está habilitado para este ambiente."
                      : `Ativar TOTP é obrigatório para o modo ${desiredMode}.`}
                  </div>
                </div>
              </div>
            </div>

            {!totpActuallyEnabled ? (
              <Button type="button" variant="outline" onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
                {initMutation.isPending ? "Iniciando..." : "Iniciar TOTP"}
              </Button>
            ) : (
              <Badge variant="success">TOTP habilitado</Badge>
            )}
          </div>

          {totp ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr]">
              <div className="flex items-center justify-center rounded-[1.75rem] border border-border/60 bg-card p-5">
                <QRCodeSVG value={totp.otpauthUrl} size={180} />
              </div>

              <div className="space-y-4">
                <Card className="border-border/60 bg-card/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Secret</div>
                  <div className="mt-2 font-mono text-sm text-foreground break-all">{totp.secret}</div>
                </Card>

                {totpExpiresInSec !== null ? (
                  <Card className="border-border/60 bg-card/60 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Expira em</div>
                    <div className="mt-2 font-mono text-sm text-foreground">
                      {totpExpiresInSec}s
                      {totpExpiresInSec === 0 ? (
                        <span className="ml-2 text-destructive">Expirado - inicie novamente.</span>
                      ) : null}
                    </div>
                  </Card>
                ) : null}

                <FormField label="Token (6 dígitos)" description="Digite o código gerado pelo aplicativo autenticador.">
                  <Input
                    className="font-mono"
                    value={totpToken}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTotpToken(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                  />
                </FormField>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => confirmMutation.mutate()}
                    disabled={confirmMutation.isPending || totpExpiresInSec === 0}
                  >
                    {confirmMutation.isPending ? "Confirmando..." : "Confirmar TOTP"}
                  </Button>
                  {totpConfirmed ? <Badge variant="success">Confirmado</Badge> : null}
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
    </SectionCard>
  );
}
