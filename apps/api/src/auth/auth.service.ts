import { Injectable, Logger, UnauthorizedException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import * as argon2 from "argon2"
import { authenticator } from "@otplib/preset-default"
import type { Env } from "../config/env.schema"

/**
 * AuthService:
 * - valida password (argon2)
 * - valida totp (otplib)
 *
 * otplib docs: :contentReference[oaicite:8]{index=8}
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  // hash derivado da ADMIN_PASSWORD (calculado 1 vez)
  private passwordHash: string | null = null

  constructor(private readonly config: ConfigService<Env>) {}

  /**
   * Inicializa o hash da senha uma vez.
   * - evita hash a cada request
   * - mantém a senha fora do fluxo direto de comparação
   */
  async initPasswordHashIfNeeded(): Promise<void> {
    const mode = this.config.getOrThrow("AUTH_MODE", { infer: true })
    const adminPassword = this.config.get("ADMIN_PASSWORD", { infer: true })

    if (mode === "password" || mode === "both") {
      // Como o schema já exige, adminPassword aqui deve existir.
      this.passwordHash = await argon2.hash(adminPassword!)
      this.logger.log("Admin password hash initialized")
    }
  }

  /**
   * Valida os campos do login conforme AUTH_MODE.
   * - lança UnauthorizedException se falhar
   */
  async validateLogin(input: { password?: string; totp?: string }): Promise<void> {
    const mode = this.config.getOrThrow("AUTH_MODE", { infer: true })

    if (mode === "none") return

    // password
    if (mode === "password" || mode === "both") {
      if (!this.passwordHash) {
        // garante que init foi chamado
        await this.initPasswordHashIfNeeded()
      }
      const ok = await argon2.verify(this.passwordHash!, input.password ?? "")
      if (!ok) {
        this.logger.warn("Invalid password")
        throw new UnauthorizedException("Invalid credentials")
      }
    }

    // totp
    if (mode === "totp" || mode === "both") {
      const secret = this.config.getOrThrow("TOTP_SECRET", { infer: true })

      // otplib valida o token pelo secret (padrão 30s)
      const ok = authenticator.verify({
        token: input.totp ?? "",
        secret,
      })

      if (!ok) {
        this.logger.warn("Invalid TOTP")
        throw new UnauthorizedException("Invalid credentials")
      }
    }
  }
}
