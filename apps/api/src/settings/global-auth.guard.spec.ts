import { ExecutionContext } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { GlobalAuthGuard } from "../auth/global-auth.guard"
import { SettingsService } from "../settings/settings.service"
import { IS_PUBLIC_KEY } from "../auth/public.decorator"
import { SessionService } from "../auth/session.service"

describe("GlobalAuthGuard (unit)", () => {
  function mockContext(signedCookies: Record<string, string> = {}) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ signedCookies }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext
  }

  it("should allow everything when authMode is none", async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector

    const settings = {
      getAuthMode: () => "none",
    } as unknown as SettingsService

    const sessions = {
      validate: jest.fn(),
    } as unknown as SessionService

    const guard = new GlobalAuthGuard(reflector, settings, sessions)

    expect(await guard.canActivate(mockContext())).toBe(true)
  })

  it("should allow public routes even when authMode is enabled", async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => key === IS_PUBLIC_KEY),
    } as unknown as Reflector

    const settings = {
      getAuthMode: () => "password",
    } as unknown as SettingsService

    const sessions = {
      validate: jest.fn(),
    } as unknown as SessionService

    const guard = new GlobalAuthGuard(reflector, settings, sessions)

    expect(await guard.canActivate(mockContext())).toBe(true)
  })

  it("should deny when authMode enabled and no session cookie", async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector

    const settings = {
      getAuthMode: () => "password",
    } as unknown as SettingsService

    const sessions = {
      validate: jest.fn().mockReturnValue(false),
    } as unknown as SessionService

    const guard = new GlobalAuthGuard(reflector, settings, sessions)

    expect(await guard.canActivate(mockContext({}))).toBe(false)
  })

  it("should allow when authMode enabled and has valid session cookie", async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector

    const settings = {
      getAuthMode: () => "password",
    } as unknown as SettingsService

    const sessions = {
      validate: jest.fn().mockReturnValue(true),
    } as unknown as SessionService

    const guard = new GlobalAuthGuard(reflector, settings, sessions)

    expect(await guard.canActivate(mockContext({ ds_session: "abc" }))).toBe(true)
    expect(sessions.validate).toHaveBeenCalledWith("abc")
  })
})
