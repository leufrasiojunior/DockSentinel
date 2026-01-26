import { validateEnv } from "./env.schema"

describe("env schema (unit)", () => {
  it("should accept defaults", () => {
    // valida com objeto vazio -> aplica defaults
    const env = validateEnv({})
    expect(env.PORT).toBe(3000)
    expect(env.LOG_LEVEL).toBe("info")
    expect(env.AUTH_MODE).toBe("none")
  })

  it("should reject invalid LOG_LEVEL", () => {
    expect(() => validateEnv({ LOG_LEVEL: "crazy" })).toThrow(/Invalid environment variables/i)
  })

  it("should reject short secret", () => {
    expect(() => validateEnv({ DOCKSENTINEL_SECRET: "short" })).toThrow()
  })
})
