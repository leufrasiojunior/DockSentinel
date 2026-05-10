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
      getCachedDefaultLocale: jest.fn().mockReturnValue("pt-BR"),
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
      getCachedDefaultLocale: jest.fn().mockReturnValue("pt-BR"),
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
      getCachedDefaultLocale: jest.fn().mockReturnValue("pt-BR"),
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

  it("should persist aggregated scan info without exposing technical mode", async () => {
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
      getCachedDefaultLocale: jest.fn().mockReturnValue("pt-BR"),
      getDefaultLocale: jest.fn().mockResolvedValue("pt-BR"),
      getRawSettings: jest.fn(),
    } as unknown as SettingsService

    const svc = new NotificationsService(
      repo,
      settings,
      { decrypt: jest.fn() } as unknown as CryptoService,
      { send: jest.fn() } as unknown as MailService,
    )

    await svc.emitScanInfo({
      mode: "scan_only",
      scanned: 3,
      queued: 0,
      scannedImages: ["api => api:latest", "web => web:latest", "db => postgres:16"],
      updateCandidates: ["api => api:latest"],
    })

    expect((repo as any).createInApp).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "scan_info",
        level: "info",
        title: "Checagem concluída",
        message: "3 container(s) checado(s). 1 com atualização disponível.",
      }),
    )

    const event = (repo as any).createInApp.mock.calls[0][0]
    expect(event.title).not.toContain("scan_only")
    expect(event.message).not.toContain("scan_only")
    expect(JSON.parse(event.payloadJson)).toEqual(
      expect.objectContaining({
        mode: "scan_only",
        updateCandidates: ["api => api:latest"],
      }),
    )
  })

  it("should use product wording for check and update scan info", async () => {
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
      getCachedDefaultLocale: jest.fn().mockReturnValue("pt-BR"),
      getDefaultLocale: jest.fn().mockResolvedValue("pt-BR"),
      getRawSettings: jest.fn(),
    } as unknown as SettingsService

    const svc = new NotificationsService(
      repo,
      settings,
      { decrypt: jest.fn() } as unknown as CryptoService,
      { send: jest.fn() } as unknown as MailService,
    )

    await svc.emitScanInfo({
      mode: "scan_and_update",
      scanned: 2,
      queued: 1,
      scannedImages: ["api => api:latest", "web => web:latest"],
      updateCandidates: ["api => api:latest"],
    })

    expect((repo as any).createInApp).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Checagem e atualização iniciadas",
        message:
          "2 container(s) checado(s). 1 com atualização disponível. 1 atualização(ões) iniciada(s).",
      }),
    )
  })

  it("should persist scan error summary with a short visible cause", async () => {
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
      getCachedDefaultLocale: jest.fn().mockReturnValue("pt-BR"),
      getDefaultLocale: jest.fn().mockResolvedValue("pt-BR"),
      getRawSettings: jest.fn(),
    } as unknown as SettingsService

    const svc = new NotificationsService(
      repo,
      settings,
      { decrypt: jest.fn() } as unknown as CryptoService,
      { send: jest.fn() } as unknown as MailService,
    )

    await svc.emitScanError({
      mode: "scan_only",
      scanned: 2,
      errors: 1,
      scannedImages: ["api (erro)", "web => web:latest"],
      updateCandidates: ["web => web:latest"],
      errorSummaries: [{ container: "api", message: "Docker indisponível" }],
    })

    expect((repo as any).createInApp).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "scan_error",
        level: "error",
        title: "Checagem concluída com falhas",
        message:
          "2 container(s) checado(s). 1 com atualização disponível. 1 com falha. Primeira falha: api - Docker indisponível.",
      }),
    )

    const event = (repo as any).createInApp.mock.calls[0][0]
    expect(event.title).not.toContain("scan_only")
    expect(event.message).not.toContain("scan_only")
    expect(JSON.parse(event.payloadJson)).toEqual(
      expect.objectContaining({
        errorSummaries: [{ container: "api", message: "Docker indisponível" }],
      }),
    )
  })
})
