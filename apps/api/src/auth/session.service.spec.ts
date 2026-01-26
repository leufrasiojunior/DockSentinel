import { ConfigService } from "@nestjs/config"
import { SessionService } from "./session.service"
import type { Env } from "../config/env.schema"

describe("SessionService (unit)", () => {
  it("should create and validate session", () => {
    const config = {
      getOrThrow: () => 1, // 1h TTL (não importa aqui)
    } as unknown as ConfigService<Env>

    const s = new SessionService(config)
    const { sessionId } = s.create()

    expect(s.validate(sessionId)).toBe(true)
  })

  it("should revoke session", () => {
    const config = {
      getOrThrow: () => 1,
    } as unknown as ConfigService<Env>

    const s = new SessionService(config)
    const { sessionId } = s.create()

    s.revoke(sessionId)
    expect(s.validate(sessionId)).toBe(false)
  })
})
