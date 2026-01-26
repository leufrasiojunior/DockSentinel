import { SetupService } from "./setup.service"
import { ConflictException } from "@nestjs/common"

describe("SetupService (unit)", () => {
  it("should throw 409 if setup already completed", async () => {
    const repo = {
      get: jest.fn().mockResolvedValue({ setupCompletedAt: new Date() }),
      upsert: jest.fn(),
    }

    const settings = {
      updateSettings: jest.fn(),
    }

    const svc = new SetupService(settings as any, repo as any)

    await expect(svc.runSetup({ authMode: "none" } as any)).rejects.toBeInstanceOf(ConflictException)
    expect(settings.updateSettings).not.toHaveBeenCalled()
  })

  it("should run setup and mark setupCompletedAt", async () => {
    const repo = {
      get: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    }

    const settings = {
      updateSettings: jest.fn().mockResolvedValue({ authMode: "none" }),
    }

    const svc = new SetupService(settings as any, repo as any)

    const res = await svc.runSetup({ authMode: "none" } as any)

    expect(settings.updateSettings).toHaveBeenCalled()
    expect(repo.upsert).toHaveBeenCalled()
    expect(res).toEqual({ authMode: "none" })
  })
})
