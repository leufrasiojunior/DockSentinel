import { Injectable, Logger, UnauthorizedException } from "@nestjs/common"
import * as argon2 from "argon2"
import { authenticator } from "@otplib/preset-default"
import { SettingsRepository } from "../settings/settings.repository"
import { CryptoService } from "../crypto/crypto.service"
import { SettingsService } from "../settings/settings.service"
import { t } from "../i18n/translate"

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly crypto: CryptoService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Valida login conforme authMode (DB -> fallback do SettingsService).
   * - lança UnauthorizedException se falhar
   */
async validateLogin(input: { password?: string; totp?: string }): Promise<void> {
  const mode = await this.settingsService.getAuthMode()

  // loga o modo e o payload (sem valores)
  this.logger.debug(`[validateLogin] mode=${mode}`)
  this.logger.debug(`[validateLogin] payload hasPassword=${!!input.password} hasTotp=${!!input.totp}`)

  if (mode === "none") return

  const row = await this.settingsRepo.get()
  this.logger.debug(
    `[validateLogin] dbRow=${!!row} hasHash=${!!row?.adminPasswordHash} hasTotpEnc=${!!row?.totpSecretEnc}`
  )

  if (!row) throw new UnauthorizedException(t("auth.invalidCredentials"))

  // PASSWORD
  if (mode === "password" || mode === "both") {
    if (!input.password) throw new UnauthorizedException(t("auth.invalidCredentials"))
    if (!row.adminPasswordHash) throw new UnauthorizedException(t("auth.invalidCredentials"))

    const ok = await argon2.verify(row.adminPasswordHash, input.password)
    this.logger.debug(`[validateLogin] password_verify=${ok}`)
    if (!ok) throw new UnauthorizedException(t("auth.invalidCredentials"))
  }

  // TOTP
  if (mode === "totp" || mode === "both") {
    const token = (input.totp ?? "").trim()
    this.logger.debug(`[validateLogin] tokenFormatOk=${/^\d{6}$/.test(token)}`)

    if (!/^\d{6}$/.test(token)) throw new UnauthorizedException(t("auth.invalidCredentials"))
    if (!row.totpSecretEnc) throw new UnauthorizedException(t("auth.invalidCredentials"))

    let secret: string
    try {
      secret = this.crypto.decrypt(row.totpSecretEnc)
      this.logger.debug(`[validateLogin] decrypt_ok=true secretLen=${secret.length}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      this.logger.error(`[validateLogin] decrypt_ok=false err=${msg}`)
      throw new UnauthorizedException(t("auth.invalidCredentials"))
    }

    const ok = authenticator.verify({ token, secret })
    this.logger.debug(`[validateLogin] totp_verify=${ok}`)
    if (!ok) throw new UnauthorizedException(t("auth.invalidCredentials"))
  }
}

}
