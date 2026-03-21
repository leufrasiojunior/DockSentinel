import { NotificationsService } from "./notifications.service"
import type { NotificationsRepository } from "./notifications.repository"
import type { SettingsService } from "../settings/settings.service"
import type { CryptoService } from "../crypto/crypto.service"
import type { MailService } from "../mail/mail.service"

describe("NotificationsService", () => {
  it("should persist in-app notification when enabled", async () => {
    const repo = {
      createInApp: jest.fn().mockResolvedValue(undefined),
      listForClient: jest.fn(),
    } as unknown as NotificationsRepository

    const settings = {
      getSafeSettings: jest.fn().mockResolvedValue({
        notificationsInAppEnabled: true,
        notificationsEmailEnabled: false,
        notificationLevel: "all",
      }),
      getDefaultLocale: jest.fn().mockResolvedValue("pt-BR"),
      getRawSettings: jest.fn(),
    } as unknown as SettingsService

    const svc = new NotificationsService(
      repo,
      settings,
      { decrypt: jest.fn() } as unknown as CryptoService,
      { send: jest.fn() } as unknown as MailService,
    )

    await svc.emitJobSuccess({
      jobId: "job_1",
      status: "success",
      container: "nginx",
      image: "nginx:latest",
      finishedAt: new Date().toISOString(),
      error: null,
    })

    expect((repo as any).createInApp).toHaveBeenCalledTimes(1)
  })

  it("should attempt email send when enabled", async () => {
    const repo = {
      createInApp: jest.fn().mockResolvedValue(undefined),
      listForClient: jest.fn(),
    } as unknown as NotificationsRepository

    const settings = {
      getSafeSettings: jest.fn().mockResolvedValue({
        notificationsInAppEnabled: false,
        notificationsEmailEnabled: true,
        notificationLevel: "all",
        smtpHost: "smtp.example.com",
        smtpPort: 587,
        smtpSecureMode: "starttls",
        smtpUsername: "user",
        smtpFromName: "DockSentinel",
        smtpFromEmail: "no-reply@example.com",
      }),
      getDefaultLocale: jest.fn().mockResolvedValue("pt-BR"),
      getRawSettings: jest.fn().mockResolvedValue({ smtpPasswordEnc: "enc" }),
    } as unknown as SettingsService

    const mail = { send: jest.fn().mockResolvedValue(undefined) } as unknown as MailService
    const svc = new NotificationsService(
      repo,
      settings,
      { decrypt: jest.fn().mockReturnValue("secret") } as unknown as CryptoService,
      mail,
    )

    await svc.emitJobFailed({
      jobId: "job_2",
      status: "failed",
      container: "nginx",
      image: "nginx:latest",
      finishedAt: new Date().toISOString(),
      error: "boom",
    })

    expect((mail as any).send).toHaveBeenCalledTimes(1)
  })

  it("should skip info notifications when level is errors_only", async () => {
    const repo = {
      createInApp: jest.fn().mockResolvedValue(undefined),
      listForClient: jest.fn(),
    } as unknown as NotificationsRepository

    const settings = {
      getSafeSettings: jest.fn().mockResolvedValue({
        notificationsInAppEnabled: true,
        notificationsEmailEnabled: true,
        notificationLevel: "errors_only",
      }),
      getDefaultLocale: jest.fn().mockResolvedValue("pt-BR"),
      getRawSettings: jest.fn(),
    } as unknown as SettingsService

    const mail = { send: jest.fn().mockResolvedValue(undefined) } as unknown as MailService
    const svc = new NotificationsService(
      repo,
      settings,
      { decrypt: jest.fn().mockReturnValue("secret") } as unknown as CryptoService,
      mail,
    )

    await svc.emitScanInfo({
      mode: "scan_only",
      scanned: 2,
      queued: 0,
      updateCandidates: [],
    })

    expect((repo as any).createInApp).not.toHaveBeenCalled()
    expect((mail as any).send).not.toHaveBeenCalled()
  })
})
