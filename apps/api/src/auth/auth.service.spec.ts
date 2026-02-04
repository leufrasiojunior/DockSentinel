import { ConfigService } from "@nestjs/config"
import { authenticator } from "@otplib/preset-default"
import { AuthService } from "./auth.service"
import type { Env } from "../config/env.schema"

describe("AuthService (unit)", () => {
  it("should validate password mode", async () => {
    const config = {
      getOrThrow: (k: keyof Env) => (k === "AUTH_MODE" ? "password" : undefined),
      get: (k: keyof Env) => (k === "ADMIN_PASSWORD" ? "MyStrongPass123" : undefined),
    } as unknown as ConfigService<Env>

    const auth = new AuthService(config)
    await auth.initPasswordHashIfNeeded()

    await expect(auth.validateLogin({ password: "MyStrongPass123" })).resolves.toBeUndefined()
    await expect(auth.validateLogin({ password: "wrong" })).rejects.toBeTruthy()
  })

  it("should validate totp mode", async () => {
    // Secret fixo (base32) só para teste — evita API async/typing variável
    const secret = "JBSWY3DPEHPK3PXP" // base32 válido (exemplo clássico)

    const config = {
      getOrThrow: (k: keyof Env) =>
        k === "AUTH_MODE" ? "totp" : k === "TOTP_SECRET" ? secret : undefined,
      get: () => undefined,
    } as unknown as ConfigService<Env>

    const auth = new AuthService(config)

    /**
     * Gera um token TOTP válido para esse secret.
     * Dependendo da versão, `authenticator.generate(secret)` pode dar typing estranho.
     * Então fazemos cast seguro aqui porque no runtime funciona.
     */
    const token = authenticator.generate(secret)

    await expect(auth.validateLogin({ totp: token })).resolves.toBeUndefined()
    await expect(auth.validateLogin({ totp: "000000" })).rejects.toBeTruthy()
  })
})
