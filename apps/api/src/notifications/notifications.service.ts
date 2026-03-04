import { Injectable, Logger } from "@nestjs/common"
import { CryptoService } from "../crypto/crypto.service"
import { MailSecureMode, MailService } from "../mail/mail.service"
import { SettingsService } from "../settings/settings.service"
import { NotificationsRepository } from "./notifications.repository"
import type {
  GenericNotificationPayload,
  JobNotificationPayload,
  NotificationEventType,
  NotificationLevel,
} from "./notifications.types"

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly settings: SettingsService,
    private readonly crypto: CryptoService,
    private readonly mail: MailService,
  ) {}

  async listForClient(input: { afterId?: string; take?: number }) {
    const items = await this.repo.listForClient({
      afterId: input.afterId,
      take: input.take ?? 20,
    })

    return {
      items: items.map((item) => ({
        id: item.id,
        channel: "in_app" as const,
        type: item.type as NotificationEventType,
        level: item.level === "error" ? "error" : "info",
        title: item.title,
        message: item.message,
        createdAt: item.createdAt,
        readAt: item.readAt,
        meta: this.parsePayload(item.payloadJson),
      })),
    }
  }

  async markRead(id: string) {
    return this.repo.markRead(id)
  }

  async markAllRead() {
    return this.repo.markAllRead()
  }

  async cleanupExpiredBySettings() {
    const safe = await this.settings.getSafeSettings()
    const readDays = this.normalizeRetentionDays(safe.notificationReadRetentionDays, 15)
    const unreadDays = this.normalizeRetentionDays(safe.notificationUnreadRetentionDays, 60)
    return this.repo.cleanupExpired(readDays, unreadDays)
  }

  async emitJobSuccess(payload: JobNotificationPayload) {
    await this.emit({
      type: "job_success",
      level: "info",
      title: `Atualização concluída: ${payload.container}`,
      message: `Container ${payload.container} atualizado com sucesso.`,
      payload,
    })
  }

  async emitJobFailed(payload: JobNotificationPayload) {
    await this.emit({
      type: "job_failed",
      level: "error",
      title: `Falha na atualização: ${payload.container}`,
      message: `Falha ao atualizar ${payload.container}: ${payload.error ?? "erro desconhecido"}`,
      payload,
    })
  }

  async emitScanInfo(message: string, payload?: GenericNotificationPayload) {
    const mode = typeof payload?.mode === "string" ? payload.mode : "scan_only"
    await this.emit({
      type: "scan_info",
      level: "info",
      title: `Scan de containers (${mode})`,
      message,
      payload,
    })
  }

  async emitScanError(message: string, payload?: GenericNotificationPayload) {
    const mode = typeof payload?.mode === "string" ? payload.mode : "scan_only"
    await this.emit({
      type: "scan_error",
      level: "error",
      title: `Erro no scan de containers (${mode})`,
      message,
      payload,
    })
  }

  async emitSystemError(message: string, payload?: GenericNotificationPayload) {
    await this.emit({
      type: "system_error",
      level: "error",
      title: "Erro do sistema",
      message,
      payload,
    })
  }

  private async emit(input: {
    type: NotificationEventType
    level: NotificationLevel
    title: string
    message: string
    payload?: GenericNotificationPayload
  }) {
    const safe = await this.settings.getSafeSettings()
    if (!this.shouldDeliverByLevel(safe.notificationLevel, input.level)) return

    if (safe.notificationsInAppEnabled) {
      await this.repo.createInApp({
        type: input.type,
        level: input.level,
        title: input.title,
        message: input.message,
        payloadJson: input.payload ? JSON.stringify(input.payload) : null,
      })
    }

    if (safe.notificationsEmailEnabled) {
      await this.sendEmail({
        type: input.type,
        level: input.level,
        title: input.title,
        message: input.message,
        payload: input.payload,
        safe,
      })
    }
  }

  private shouldDeliverByLevel(levelConfig: string | undefined, level: NotificationLevel) {
    if (levelConfig === "errors_only") return level === "error"
    return true
  }

  private async sendEmail(input: {
    type: NotificationEventType
    level: NotificationLevel
    title: string
    message: string
    payload?: GenericNotificationPayload
    safe: Awaited<ReturnType<SettingsService["getSafeSettings"]>>
  }) {
    try {
      if (!input.safe.smtpHost || !input.safe.smtpPort || !input.safe.smtpFromEmail) return

      const full = await this.settings.getRawSettings()
      if (!full) return

      const password = full.smtpPasswordEnc ? this.crypto.decrypt(full.smtpPasswordEnc) : null
      if (!input.safe.smtpUsername || !password) return

      const subject = this.buildEmailSubject(input.level)
      const html = this.renderTemplate({
        level: input.level,
        title: input.title,
        message: input.message,
        type: input.type,
        payload: input.payload,
      })

      const recipient = input.safe.smtpFromEmail

      await this.mail.send(
        {
          host: input.safe.smtpHost,
          port: input.safe.smtpPort,
          secureMode: input.safe.smtpSecureMode as MailSecureMode,
          username: input.safe.smtpUsername,
          password,
          fromName: input.safe.smtpFromName || "DockSentinel",
          fromEmail: input.safe.smtpFromEmail,
        },
        {
          to: recipient,
          subject,
          html,
        },
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Failed to send email notification: ${message}`)
    }
  }

  private buildEmailSubject(level: NotificationLevel) {
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, "0")
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const weekdayRaw = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(now)
    const weekday = weekdayRaw.replace(".", "").trim()
    const levelLabel = level === "error" ? "ERRO" : "INFO"
    return `DockSentinel - (${dd}/${mm} - ${weekday}) - (${levelLabel})`
  }

  private normalizeRetentionDays(value: unknown, fallback: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback
    const n = Math.floor(value)
    if (n < 1) return 1
    if (n > 3650) return 3650
    return n
  }

  private parsePayload(payloadJson: string | null | undefined): Record<string, unknown> | undefined {
    if (!payloadJson) return undefined
    try {
      const data = JSON.parse(payloadJson)
      return data && typeof data === "object" ? (data as Record<string, unknown>) : undefined
    } catch {
      return undefined
    }
  }

  private renderTemplate(input: {
    level: NotificationLevel
    type: NotificationEventType
    title: string
    message: string
    payload?: GenericNotificationPayload
  }) {
    const scannedImages = Array.isArray(input.payload?.scannedImages)
      ? input.payload?.scannedImages.filter((v) => typeof v === "string")
      : []
    const updateCandidates = Array.isArray(input.payload?.updateCandidates)
      ? input.payload?.updateCandidates.filter((v) => typeof v === "string")
      : []

    const scannedHtml =
      scannedImages.length > 0
        ? `<div style=\"margin-top:12px\"><div style=\"font-weight:600\">Imagens escaneadas (${scannedImages.length})</div><ul style=\"margin:6px 0 0 20px\">${scannedImages
            .slice(0, 20)
            .map((item) => `<li>${item}</li>`)
            .join("")}</ul></div>`
        : ""

    const updatesHtml =
      updateCandidates.length > 0
        ? `<div style=\"margin-top:12px\"><div style=\"font-weight:600\">Com atualização disponível (${updateCandidates.length})</div><ul style=\"margin:6px 0 0 20px\">${updateCandidates
            .slice(0, 20)
            .map((item) => `<li>${item}</li>`)
            .join("")}</ul></div>`
        : `<div style=\"margin-top:12px\"><div style=\"font-weight:600\">Com atualização disponível</div><div>nenhuma</div></div>`

    const detailsHtml = input.payload
      ? `<div style=\"margin-top:12px\"><div style=\"font-weight:600\">Detalhes técnicos</div><pre style=\"background:#f8fafc;border:1px solid #e2e8f0;padding:10px;border-radius:8px;overflow:auto\">${JSON.stringify(input.payload, null, 2)}</pre></div>`
      : ""

    const levelTone = input.level === "error" ? "#dc2626" : "#0284c7"
    const levelLabel = input.level === "error" ? "ERRO" : "INFO"

    return [
      '<html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;background:#f1f5f9;padding:16px">',
      '<div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">',
      `<div style="padding:14px 16px;background:${levelTone};color:#fff;font-weight:700">DockSentinel • ${levelLabel}</div>`,
      '<div style="padding:16px">',
      `<div style="font-size:18px;font-weight:700">${input.title}</div>`,
      `<div style="margin-top:8px">${input.message}</div>`,
      '<div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px">',
      `<div><strong>Tipo:</strong> ${input.type}</div>`,
      `<div><strong>Nível:</strong> ${levelLabel}</div>`,
      "</div>",
      scannedHtml,
      updatesHtml,
      detailsHtml,
      "</div>",
      "</div>",
      "</body></html>",
    ].join("")
  }
}
