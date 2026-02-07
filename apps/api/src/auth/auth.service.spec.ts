import * as argon2 from "argon2"
import { authenticator } from "@otplib/preset-default"
import { AuthService } from "./auth.service"
import type { SettingsRepository } from "../settings/settings.repository"
import type { CryptoService } from "../crypto/crypto.service"
import type { SettingsService } from "../settings/settings.service"
import { UnauthorizedException } from "@nestjs/common"

describe("AuthService (unit)", () => {
  it("should validate password mode", async () => {
    const hash = await argon2.hash("MyStrongPass123")
    const repo: Pick<SettingsRepository, "get"> = {
      get: jest.fn().mockResolvedValue({ adminPasswordHash: hash }),
    }
    const crypto = {} as CryptoService
    const settings: Pick<SettingsService, "getAuthMode"> = {
      getAuthMode: jest.fn().mockResolvedValue("password"),
    }
    const auth = new AuthService(
      repo as SettingsRepository,
      crypto,
      settings as SettingsService,
    )

    await expect(auth.validateLogin({ password: "MyStrongPass123" })).resolves.toBeUndefined()
    await expect(auth.validateLogin({ password: "wrong" })).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it("should validate totp mode", async () => {
    const secret = "JBSWY3DPEHPK3PXP"
    const token = authenticator.generate(secret)
    const repo: Pick<SettingsRepository, "get"> = {
      get: jest.fn().mockResolvedValue({ totpSecretEnc: "enc" }),
    }
    const crypto: Pick<CryptoService, "decrypt"> = {
      decrypt: jest.fn().mockReturnValue(secret),
    }
    const settings: Pick<SettingsService, "getAuthMode"> = {
      getAuthMode: jest.fn().mockResolvedValue("totp"),
    }
    const auth = new AuthService(
      repo as SettingsRepository,
      crypto as CryptoService,
      settings as SettingsService,
    )

    await expect(auth.validateLogin({ totp: token })).resolves.toBeUndefined()
    await expect(auth.validateLogin({ totp: "000000" })).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
