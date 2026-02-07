import { BadRequestException, Injectable, Logger } from "@nestjs/common"
import * as argon2 from "argon2"
import { SettingsRepository } from "./settings.repository"
import { CryptoService } from "../crypto/crypto.service"
import type { UpdateSettingsDto } from "./dto/update-settings.dto"
import { ConfigService } from "@nestjs/config"
import { Env } from "src/config/env.schema"

type AuthMode = Env["AUTH_MODE"]
const isAuthMode = (value: unknown): value is AuthMode =>
  value === "none" || value === "password" || value === "totp" || value === "both"

/**
 * SettingsService:
 * - fonte da verdade das configs globais (DB)
 * - aplica regras (hash senha, crypto, etc)
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name)

  constructor(
    private readonly repo: SettingsRepository,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService<Env>,
  ) {}

  /**
   * Retorna settings “seguros” para UI:
   * - sem hashes e sem secrets
   */
  async getSafeSettings() {
    const row = await this.repo.get()
    return {
      authMode: isAuthMode(row?.authMode) ? row.authMode : "none",
      logLevel: row?.logLevel ?? "info",
      // flags úteis para UI
      hasPassword: Boolean(row?.adminPasswordHash),
      hasTotp: Boolean(row?.totpSecretEnc),
      createdAt: row?.createdAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    }
  }

  /**
   * Atualiza settings globais no DB (singleton).
   * - Se adminPassword vier, gera hash e salva.
   * - Se totpSecret vier, criptografa e salva.
   */
  async updateSettings(dto: UpdateSettingsDto) {
    const row = await this.repo.get()
    const currentAuthMode = isAuthMode(row?.authMode) ? row.authMode : "none"
    const nextAuthMode = dto.authMode ?? currentAuthMode

    const willHavePassword = Boolean(dto.adminPassword) || Boolean(row?.adminPasswordHash)
    const willHaveTotp = Boolean(dto.totpSecret) || Boolean(row?.totpSecretEnc)

    if ((nextAuthMode === "password" || nextAuthMode === "both") && !willHavePassword) {
      throw new BadRequestException("adminPassword is required for password/both modes")
    }

    if ((nextAuthMode === "totp" || nextAuthMode === "both") && !willHaveTotp) {
      throw new BadRequestException("totpSecret is required for totp/both modes")
    }

    const patch: {
      authMode?: string
      logLevel?: string
      adminPasswordHash?: string | null
      totpSecretEnc?: string | null
    } = {}

    if (dto.authMode) patch.authMode = dto.authMode
    if (dto.logLevel) patch.logLevel = dto.logLevel

    if (dto.adminPassword) {
      patch.adminPasswordHash = await argon2.hash(dto.adminPassword)
      this.logger.log("Admin password hash updated")
    }

    if (dto.totpSecret) {
      patch.totpSecretEnc = this.crypto.encrypt(dto.totpSecret)
      this.logger.log("TOTP secret updated (encrypted)")
    }

    await this.repo.upsert(patch)

    // devolve o “safe settings” atualizado
    return this.getSafeSettings()
  }

  async getAuthMode(): Promise<AuthMode> {
    try {
      const row = await this.repo.get()
      if (isAuthMode(row?.authMode)) {
        return row.authMode
      }

      // primeira configuração: sem linha no DB, libera fluxo inicial
      return "none"
    } catch {
      // fallback de boot quando o DB ainda não está acessível.
      this.logger.warn("DB not ready for settings yet; falling back to ENV")
      const fromEnv = this.config.get("AUTH_MODE", { infer: true })
      return isAuthMode(fromEnv) ? fromEnv : "none"
    }
  }
}
