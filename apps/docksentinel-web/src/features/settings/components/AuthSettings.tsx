import { QRCodeSVG } from "qrcode.react";
import { KeyRound, ShieldCheck, ShieldEllipsis } from "lucide-react";
import { useTranslation } from "react-i18next";

import { FormField } from "../../../components/product/form-field";
import { SectionCard } from "../../../components/product/section-card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { formatDateTime } from "../../../i18n/format";
import { getAuthModeLabel } from "../../../i18n/helpers";
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
  const { t } = useTranslation();
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
      title={t("settings.auth.sectionTitle")}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {t("common.labels.currentMode")}: {getAuthModeLabel(t, currentMode)}
          </Badge>
          <Badge variant="outline">
            {t("common.labels.createdAt")}: {formatDateTime(safe.createdAt) ?? t("settings.auth.invalidDate")}
          </Badge>
          <Badge variant="outline">
            {t("common.labels.updatedAt")}: {formatDateTime(safe.updatedAt) ?? t("settings.auth.invalidDate")}
          </Badge>
        </span>
      }
      actions={
        <Button
          variant="primary"
          type="button"
          onClick={handleSave}
          disabled={isSaving || !canSave}
          title={!canSave ? t("settings.auth.saveDisabled") : undefined}
        >
          {isSaving ? t("common.actions.saving") : t("settings.auth.save")}
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={t("settings.auth.authMode")} description={t("settings.auth.authModeDescription")}>
          <Select
            value={desiredMode}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setDesiredMode(e.target.value as AuthMode);
              setTotp(null);
            }}
          >
            <option value="none">{t("common.authModes.none")}</option>
            <option value="password">{t("common.authModes.password")}</option>
            <option value="totp">{t("common.authModes.totp")}</option>
            <option value="both">{t("common.authModes.both")}</option>
          </Select>
        </FormField>

        <FormField label={t("settings.auth.logLevel")} description={t("settings.auth.logLevelDescription")}>
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
                <div className="text-sm font-semibold text-foreground">{t("settings.auth.adminPasswordTitle")}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {safe.hasPassword
                    ? t("settings.auth.keepPasswordHint")
                    : t("settings.auth.newPasswordRequiredHint")}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FormField label={t("settings.auth.newPassword")} description={t("settings.auth.newPasswordDescription")}>
                <Input
                  type="password"
                  placeholder={t("settings.auth.newPasswordPlaceholder")}
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                />
              </FormField>

              <FormField label={t("settings.auth.confirmPassword")} description={t("settings.auth.confirmPasswordDescription")}>
                <Input
                  type="password"
                  placeholder={t("settings.auth.confirmPasswordPlaceholder")}
                  value={newPassword2}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword2(e.target.value)}
                />
              </FormField>
            </div>

            {!safe.hasPassword && !isChangingPassword ? (
              <div className="mt-4 text-sm font-medium text-amber-700 dark:text-amber-300">
                {t("settings.auth.missingPasswordWarning")}
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
                  <div className="text-sm font-semibold text-foreground">{t("settings.auth.totpTitle")}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {totpActuallyEnabled
                      ? t("settings.auth.totpEnabledHint")
                      : t("settings.auth.totpRequiredHint", {
                          mode: getAuthModeLabel(t, desiredMode),
                        })}
                  </div>
                </div>
              </div>
            </div>

            {!totpActuallyEnabled ? (
              <Button type="button" variant="outline" onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
                {initMutation.isPending ? t("settings.auth.startingTotp") : t("settings.auth.startTotp")}
              </Button>
            ) : (
              <Badge variant="success">{t("settings.auth.enabledBadge")}</Badge>
            )}
          </div>

          {totp ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr]">
              <div className="flex items-center justify-center rounded-[1.75rem] border border-border/60 bg-card p-5">
                <QRCodeSVG value={totp.otpauthUrl} size={180} />
              </div>

              <div className="space-y-4">
                <Card className="border-border/60 bg-card/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("common.labels.secret")}</div>
                  <div className="mt-2 font-mono text-sm text-foreground break-all">{totp.secret}</div>
                </Card>

                {totpExpiresInSec !== null ? (
                  <Card className="border-border/60 bg-card/60 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("settings.auth.expiresIn")}</div>
                    <div className="mt-2 font-mono text-sm text-foreground">
                      {totpExpiresInSec}s
                      {totpExpiresInSec === 0 ? (
                        <span className="ml-2 text-destructive">{t("settings.auth.expired")}</span>
                      ) : null}
                    </div>
                  </Card>
                ) : null}

                <FormField label={t("settings.auth.tokenLabel")} description={t("settings.auth.tokenDescription")}>
                  <Input
                    className="font-mono"
                    value={totpToken}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTotpToken(e.target.value)}
                    placeholder={t("login.totpPlaceholder")}
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
                    {confirmMutation.isPending ? t("settings.auth.confirmingTotp") : t("settings.auth.confirmTotp")}
                  </Button>
                  {totpConfirmed ? <Badge variant="success">{t("settings.auth.confirmed")}</Badge> : null}
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
    </SectionCard>
  );
}
