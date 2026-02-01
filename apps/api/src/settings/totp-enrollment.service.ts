import { Injectable, Logger, UnauthorizedException, BadRequestException } from "@nestjs/common"
import { authenticator } from "@otplib/preset-default"
import { randomUUID } from "crypto"
import { SettingsRepository } from "./settings.repository"
import { CryptoService } from "../crypto/crypto.service"
import { SettingsService } from "./settings.service"

type PendingTotp = {
  secret: string
  expiresAt: number
  label: string
}

@Injectable()
export class TotpEnrollmentService {
  private readonly logger = new Logger(TotpEnrollmentService.name)

  // MVP: memória local (1 instância)
  private readonly pending = new Map<string, PendingTotp>()

  // 5 minutos por padrão
  private readonly ttlMs = Number(process.env.TOTP_ENROLL_TTL_MS ?? 5 * 60_000)

  constructor(
    private readonly repo: SettingsRepository,
    private readonly crypto: CryptoService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Inicia o enrollment:
   * - gera secret
   * - monta otpauthUrl
   * - guarda secret temporariamente
   */
  async init(label?: string) {
    const issuer = "DockSentinel"
    const accountLabel = (label?.trim() || "admin").slice(0, 64)

    const secret = authenticator.generateSecret() // base32
    const otpauthUrl = authenticator.keyuri(accountLabel, issuer, secret)

    const challengeId = randomUUID()
    const expiresAt = Date.now() + this.ttlMs

    this.pending.set(challengeId, { secret, expiresAt, label: accountLabel })

    this.logger.log(`TOTP enrollment initiated label=${accountLabel} challengeId=${challengeId}`)

    return {
      challengeId,
      otpauthUrl,
      secret,
      expiresAt: new Date(expiresAt).toISOString(),
    }
  }

  /**
   * Confirma o enrollment:
   * - valida token contra o secret pendente
   * - se ok: salva totpSecretEnc no DB e ajusta authMode automaticamente
   */
  async confirm(challengeId: string, token: string) {
    const p = this.pending.get(challengeId)
    if (!p) throw new BadRequestException("Invalid or expired challengeId")

    // expirou?
    if (Date.now() > p.expiresAt) {
      this.pending.delete(challengeId)
      throw new BadRequestException("Challenge expired")
    }

    const ok = authenticator.verify({ token, secret: p.secret })
    if (!ok) throw new UnauthorizedException("Invalid TOTP token")

    // ok -> persistir
    const enc = this.crypto.encrypt(p.secret)

    // pega authMode atual (DB->fallback)
    const current = await this.settings.getAuthMode()

    // regra automática simples:
    // none -> totp
    // password -> both
    // totp -> totp
    // both -> both
    const next =
      current === "password" ? "both" :
      current === "none" ? "totp" :
      current

    await this.repo.upsert({
      totpSecretEnc: enc,
      authMode: next,
    })

    // encerra o challenge
    this.pending.delete(challengeId)

    this.logger.log(`TOTP enabled. authMode=${next}`)

    return { ok: true as const, authMode: next }
  }
}
