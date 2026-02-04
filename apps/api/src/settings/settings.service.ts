import { Injectable, Logger } from "@nestjs/common"
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
      authMode: row?.authMode ?? "none",
      logLevel: row?.logLevel ?? "info",
      // flags úteis para UI
      hasPassword: Boolean(row?.adminPasswordHash),
      hasTotp: Boolean(row?.totpSecretEnc),
    }
  }

  /**
   * Atualiza settings globais no DB (singleton).
   * - Se adminPassword vier, gera hash e salva.
   * - Se totpSecret vier, criptografa e salva.
   */
  async updateSettings(dto: UpdateSettingsDto) {
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

    // ✅ Se setup já foi concluído, DB manda
    if (row?.setupCompletedAt && isAuthMode(row?.authMode)) {
      return row.authMode
    }

    // ✅ Se setup ainda NÃO foi concluído, podemos usar ENV como "default"
    const fromEnv = this.config.get("AUTH_MODE", { infer: true })
    return isAuthMode(fromEnv) ? fromEnv : "none"
  } catch {
    // ✅ Se DB não está acessível (ex.: primeiro boot / migrations não rodaram ainda),
    // cai no ENV para não quebrar a API.
    this.logger.warn("DB not ready for settings yet; falling back to ENV")
    const fromEnv = this.config.get("AUTH_MODE", { infer: true })
    return isAuthMode(fromEnv) ? fromEnv : "none"
  }
}


}
