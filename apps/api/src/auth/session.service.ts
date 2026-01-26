import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { randomBytes } from "crypto"
import type { Env } from "../config/env.schema"

/**
 * SessionService:
 * - cria/valida/revoga sessões
 * - por enquanto é in-memory (Map)
 * - depois trocamos para DB (Prisma) sem mudar controller/guard
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name)

  // sessionId -> expiresAt (epoch ms)
  private readonly sessions = new Map<string, number>()

  private readonly ttlMs: number

  constructor(private readonly config: ConfigService<Env>) {
    const ttlHours = this.config.getOrThrow("SESSION_TTL_HOURS", { infer: true })
    this.ttlMs = ttlHours * 60 * 60 * 1000
  }

  /**
   * Cria uma sessão aleatória forte (32 bytes -> 64 hex chars).
   */
  create(): { sessionId: string; expiresAt: number } {
    const sessionId = randomBytes(32).toString("hex")
    const expiresAt = Date.now() + this.ttlMs

    this.sessions.set(sessionId, expiresAt)
    this.logger.log(`Session created (expires in ${Math.round(this.ttlMs / 1000)}s)`)

    return { sessionId, expiresAt }
  }

  /**
   * Valida se a sessão existe e não expirou.
   */
  validate(sessionId: string | undefined): boolean {
    if (!sessionId) return false

    const expiresAt = this.sessions.get(sessionId)
    if (!expiresAt) return false

    if (Date.now() > expiresAt) {
      // remove sessões expiradas automaticamente
      this.sessions.delete(sessionId)
      this.logger.warn(`Session expired -> deleted`)
      return false
    }

    return true
  }

  /**
   * Revoga uma sessão (logout).
   */
  revoke(sessionId: string | undefined): void {
    if (!sessionId) return
    const existed = this.sessions.delete(sessionId)
    if (existed) this.logger.log(`Session revoked`)
  }
}
