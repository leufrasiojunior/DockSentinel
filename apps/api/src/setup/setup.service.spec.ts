import { SetupService } from "./setup.service"
import { ConflictException } from "@nestjs/common"
import type { SettingsService } from "../settings/settings.service"
import type { SettingsRepository } from "../settings/settings.repository"
import type { SetupDto } from "./setup.dto"

describe("SetupService (unit)", () => {
  it("should throw 409 if setup already completed", async () => {
    const repo: Pick<SettingsRepository, "get" | "upsert"> = {
      get: jest.fn().mockResolvedValue({ setupCompletedAt: new Date() }),
      upsert: jest.fn(),
    }

    const settings: Pick<SettingsService, "updateSettings"> = {
      updateSettings: jest.fn(),
    }

    const svc = new SetupService(settings as SettingsService, repo as SettingsRepository)

    const input: SetupDto = { authMode: "none" }
    await expect(svc.runSetup(input)).rejects.toBeInstanceOf(ConflictException)
    expect(settings.updateSettings).not.toHaveBeenCalled()
  })

  it("should run setup and mark setupCompletedAt", async () => {
    const repo: Pick<SettingsRepository, "get" | "upsert"> = {
      get: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    }

    const settings: Pick<SettingsService, "updateSettings"> = {
      updateSettings: jest.fn().mockResolvedValue({ authMode: "none" }),
    }

    const svc = new SetupService(settings as SettingsService, repo as SettingsRepository)

    const input: SetupDto = { authMode: "none" }
    const res = await svc.runSetup(input)

    expect(settings.updateSettings).toHaveBeenCalled()
    expect(repo.upsert).toHaveBeenCalled()
    expect(res).toEqual({ authMode: "none" })
  })
})
