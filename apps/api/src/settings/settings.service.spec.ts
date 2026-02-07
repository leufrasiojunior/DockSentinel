import { SettingsService } from "./settings.service"
import { CryptoService } from "../crypto/crypto.service"
import type { SettingsRepository, SettingsPatch } from "./settings.repository"
import type { ConfigService } from "@nestjs/config"
import type { Env } from "../config/env.schema"
import { BadRequestException } from "@nestjs/common"

describe("SettingsService (unit)", () => {
  beforeAll(() => {
    process.env.DOCKSENTINEL_SECRET = "CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN"
  })

  it("should update password and totp, returning safe settings", async () => {
    /**
     * Vamos simular um "DB em memória":
     * - upsert grava em `db`
     * - get devolve o que está em `db`
     */
    const db: {
      value:
        | (SettingsPatch & {
            id: number
            createdAt: Date
            updatedAt: Date
          })
        | null
    } = { value: null }


    const repo: Pick<SettingsRepository, "get" | "upsert"> = {
      get: jest.fn().mockImplementation(async () => db.value ?? null),
      upsert: jest.fn().mockImplementation(async (patch: SettingsPatch) => {
        const now = new Date()
        // cria/atualiza o registro como Prisma faria
        db.value = {
          id: 1,
          authMode: patch.authMode ?? db.value?.authMode ?? "none",
          logLevel: patch.logLevel ?? db.value?.logLevel ?? "info",
          adminPasswordHash: patch.adminPasswordHash ?? db.value?.adminPasswordHash ?? null,
          totpSecretEnc: patch.totpSecretEnc ?? db.value?.totpSecretEnc ?? null,
          createdAt: db.value?.createdAt ?? now,
          updatedAt: now,
        }
        return db.value
      }),
    }

    const crypto = new CryptoService()
    const config = {
      get: jest.fn().mockReturnValue("none"),
      getOrThrow: jest.fn().mockReturnValue("none"),
    } as unknown as ConfigService<Env>
    const svc = new SettingsService(
      repo as SettingsRepository,
      crypto,
      config,
    )

    const result = await svc.updateSettings({
      authMode: "both",
      logLevel: "debug",
      adminPassword: "MyStrongPass123",
      totpSecret: "JBSWY3DPEHPK3PXP",
    })

    expect(repo.upsert).toHaveBeenCalled()
    expect(result.authMode).toBe("both")
    expect(result.logLevel).toBe("debug")
    expect(result.hasPassword).toBe(true)
    expect(result.hasTotp).toBe(true)
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.updatedAt).toBeInstanceOf(Date)
  })

  it("should reject password mode without password configured", async () => {
    const repo: Pick<SettingsRepository, "get" | "upsert"> = {
      get: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    }

    const crypto = new CryptoService()
    const config = {
      get: jest.fn().mockReturnValue("none"),
      getOrThrow: jest.fn().mockReturnValue("none"),
    } as unknown as ConfigService<Env>
    const svc = new SettingsService(
      repo as SettingsRepository,
      crypto,
      config,
    )

    await expect(
      svc.updateSettings({
        authMode: "password",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(repo.upsert).not.toHaveBeenCalled()
  })
})
