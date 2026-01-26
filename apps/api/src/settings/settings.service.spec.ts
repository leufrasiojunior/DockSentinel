import { SettingsService } from "./settings.service"
import { CryptoService } from "../crypto/crypto.service"

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
    const db: { value: any } = { value: null }


    const repo = {
      get: jest.fn().mockImplementation(async () => db.value ?? null),
      upsert: jest.fn().mockImplementation(async (patch: any) => {
        // cria/atualiza o registro como Prisma faria
        db.value = {
          id: 1,
          authMode: patch.authMode ?? db.value?.authMode ?? "none",
          logLevel: patch.logLevel ?? db.value?.logLevel ?? "info",
          adminPasswordHash: patch.adminPasswordHash ?? db.value?.adminPasswordHash ?? null,
          totpSecretEnc: patch.totpSecretEnc ?? db.value?.totpSecretEnc ?? null,
        }
        return db.value
      }),
    }

    const crypto = new CryptoService()
    const svc = new SettingsService(repo as any, crypto)

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
  })
})
