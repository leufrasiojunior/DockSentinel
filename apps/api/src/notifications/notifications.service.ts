import { Injectable, Logger } from "@nestjs/common"
import { CryptoService } from "../crypto/crypto.service"
import { getCurrentLocale, type AppLocale } from "../i18n/locale"
import { t } from "../i18n/translate"
import { MailSecureMode, MailService } from "../mail/mail.service"
import { SettingsService } from "../settings/settings.service"
import { NotificationsRepository } from "./notifications.repository"
import type {
  GenericNotificationPayload,
  JobNotificationPayload,
  NotificationEventType,
  NotificationLevel,
} from "./notifications.types"
import { LOCAL_ENVIRONMENT_ID, LOCAL_ENVIRONMENT_NAME } from "../environments/environment.constants"

type NotificationEnvironmentContext = {
  environmentId?: string
  environmentName?: string
}

type ScanErrorSummary = {
  container?: string
  message: string
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly settings: SettingsService,
    private readonly crypto: CryptoService,
    private readonly mail: MailService,
  ) {}

  async listForClient(input: { afterId?: string; take?: number; environmentId?: string }) {
    const items = await this.repo.listForClient({
      afterId: input.afterId,
      take: input.take ?? 20,
      environmentId: input.environmentId ?? LOCAL_ENVIRONMENT_ID,
    })

    return {
      items: items.map((item) => ({
        id: item.id,
        environmentId: item.environmentId,
        environmentName: item.environmentName,
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

  async markReadForEnvironment(environmentId: string, id: string) {
    return this.repo.markRead(id, environmentId)
  }

  async markUnread(id: string) {
    return this.repo.markUnread(id)
  }

  async markUnreadForEnvironment(environmentId: string, id: string) {
    return this.repo.markUnread(id, environmentId)
  }

  async markAllRead(environmentId?: string) {
    return this.repo.markAllRead(environmentId)
  }

  async deleteOne(id: string) {
    return this.repo.deleteOne(id)
  }

  async deleteOneForEnvironment(environmentId: string, id: string) {
    return this.repo.deleteOne(id, environmentId)
  }

  async deleteMany(ids: string[]) {
    return this.repo.deleteMany(ids)
  }

  async deleteManyForEnvironment(environmentId: string, ids: string[]) {
    return this.repo.deleteMany(ids, environmentId)
  }

  async cleanupExpiredBySettings() {
    const safe = await this.settings.getSafeSettings()
    const readDays = this.normalizeRetentionDays(safe.notificationReadRetentionDays, 15)
    const unreadDays = this.normalizeRetentionDays(safe.notificationUnreadRetentionDays, 60)
    return this.repo.cleanupExpired(readDays, unreadDays)
  }

  async emitJobSuccess(
    payload: JobNotificationPayload,
    locale?: AppLocale,
    environment?: NotificationEnvironmentContext,
  ) {
    const resolvedLocale = await this.resolveLocale(locale)

    await this.emit({
      type: "job_success",
      level: "info",
      title: t("notifications.jobSuccessTitle", { container: payload.container }, resolvedLocale),
      message: t("notifications.jobSuccessMessage", { container: payload.container }, resolvedLocale),
      payload,
      locale: resolvedLocale,
      environment,
    })
  }

  async emitJobFailed(
    payload: JobNotificationPayload,
    locale?: AppLocale,
    environment?: NotificationEnvironmentContext,
  ) {
    const resolvedLocale = await this.resolveLocale(locale)

    await this.emit({
      type: "job_failed",
      level: "error",
      title: t("notifications.jobFailedTitle", { container: payload.container }, resolvedLocale),
      message: t(
        "notifications.jobFailedMessage",
        {
          container: payload.container,
          error: payload.error ?? t("notifications.unknownError", undefined, resolvedLocale),
        },
        resolvedLocale,
      ),
      payload,
      locale: resolvedLocale,
      environment,
    })
  }

  async emitScanInfo(
    payload?: GenericNotificationPayload,
    locale?: AppLocale,
    environment?: NotificationEnvironmentContext,
  ) {
    const resolvedLocale = await this.resolveLocale(locale)
    const scanMeta = this.extractScanMeta(payload, resolvedLocale)

    await this.emit({
      type: "scan_info",
      level: "info",
      title: t(
        scanMeta.mode === "scan_and_update"
          ? "notifications.scanUpdateInfoTitle"
          : "notifications.scanInfoTitle",
        undefined,
        resolvedLocale,
      ),
      message: t(
        scanMeta.mode === "scan_and_update"
          ? "notifications.scanUpdateInfoMessage"
          : "notifications.scanInfoMessage",
        {
          scanned: scanMeta.scanned,
          queued: scanMeta.queued,
          updates: scanMeta.updates,
        },
        resolvedLocale,
      ),
      payload,
      locale: resolvedLocale,
      environment,
    })
  }

  async emitScanError(
    payload?: GenericNotificationPayload,
    locale?: AppLocale,
    environment?: NotificationEnvironmentContext,
  ) {
    const resolvedLocale = await this.resolveLocale(locale)
    const scanMeta = this.extractScanMeta(payload, resolvedLocale)
    const firstError = scanMeta.firstError
      ? t(
          "notifications.scanErrorFirstError",
          {
            container: scanMeta.firstError.container ?? t("notifications.unknownContainer", undefined, resolvedLocale),
            message: scanMeta.firstError.message,
          },
          resolvedLocale,
        )
      : ""
    const message = t(
      "notifications.scanErrorMessage",
      {
        scanned: scanMeta.scanned,
        queued: scanMeta.queued,
        errors: scanMeta.errors,
        updates: scanMeta.updates,
      },
      resolvedLocale,
    )

    await this.emit({
      type: "scan_error",
      level: "error",
      title: t("notifications.scanErrorTitle", undefined, resolvedLocale),
      message: firstError ? `${message} ${firstError}` : message,
      payload,
      locale: resolvedLocale,
      environment,
    })
  }

  async emitSystemError(
    message: string,
    payload?: GenericNotificationPayload,
    locale?: AppLocale,
    environment?: NotificationEnvironmentContext,
  ) {
    const resolvedLocale = await this.resolveLocale(locale)

    await this.emit({
      type: "system_error",
      level: "error",
      title: t("notifications.systemErrorTitle", undefined, resolvedLocale),
      message: t("notifications.systemErrorMessage", { message }, resolvedLocale),
      payload,
      locale: resolvedLocale,
      environment,
    })
  }

  async emitEnvironmentOffline(
    environmentName: string,
    error: string,
    payload?: GenericNotificationPayload,
    locale?: AppLocale,
  ) {
    const resolvedLocale = await this.resolveLocale(locale)

    await this.emit({
      type: "system_error",
      level: "error",
      title: t("notifications.environmentOfflineTitle", { environment: environmentName }, resolvedLocale),
      message: t(
        "notifications.environmentOfflineMessage",
        { environment: environmentName, error },
        resolvedLocale,
      ),
      payload,
      locale: resolvedLocale,
    })
  }

  private async emit(input: {
    type: NotificationEventType
    level: NotificationLevel
    title: string
    message: string
    payload?: GenericNotificationPayload
    locale: AppLocale
    environment?: NotificationEnvironmentContext
  }) {
    const safe = await this.settings.getSafeSettings()
    if (!this.shouldDeliverByLevel(safe.notificationLevel, input.level)) return

    if (safe.notificationsInAppEnabled) {
      await this.repo.createInApp({
        environmentId: input.environment?.environmentId ?? LOCAL_ENVIRONMENT_ID,
        environmentName: input.environment?.environmentName ?? LOCAL_ENVIRONMENT_NAME,
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
        locale: input.locale,
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
    locale: AppLocale
  }) {
    try {
      if (!input.safe.smtpHost || !input.safe.smtpPort || !input.safe.smtpFromEmail) return

      const full = await this.settings.getRawSettings()
      if (!full) return

      const password = full.smtpPasswordEnc ? this.crypto.decrypt(full.smtpPasswordEnc) : null
      if (!input.safe.smtpUsername || !password) return

      const subject = this.buildEmailSubject(input.title, input.locale)
      const html = this.renderTemplate({
        level: input.level,
        title: input.title,
        message: input.message,
        type: input.type,
        payload: input.payload,
        locale: input.locale,
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

  private buildEmailSubject(title: string, locale: AppLocale) {
    return t("notifications.emailSubject", { title }, locale)
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
    locale: AppLocale
  }) {
    const levelTone = input.level === "error" ? "#dc2626" : "#0284c7"
    const scannedImages = this.extractStringList(input.payload?.scannedImages)
    const updateCandidates = this.extractStringList(input.payload?.updateCandidates)
    const errorSummaries = this.extractScanErrorSummaries(input.payload)
    const isScanEvent = input.type === "scan_info" || input.type === "scan_error"
    const sections = [
      this.renderListSection({
        title: t("notifications.emailScannedImages", { count: scannedImages.length }, input.locale),
        items: scannedImages,
        locale: input.locale,
      }),
      isScanEvent
        ? this.renderListSection({
            title: t("notifications.emailUpdateCandidates", { count: updateCandidates.length }, input.locale),
            items: updateCandidates,
            emptyText: t("notifications.none", undefined, input.locale),
            locale: input.locale,
          })
        : "",
      this.renderFailureSection(errorSummaries, input.locale),
    ].join("")

    return [
      '<html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;background:#f1f5f9;padding:16px">',
      '<div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">',
      `<div style="padding:14px 16px;background:${levelTone};color:#fff;font-weight:700">DockSentinel</div>`,
      '<div style="padding:16px">',
      `<div style="font-size:18px;font-weight:700">${this.escapeHtml(input.title)}</div>`,
      `<div style="margin-top:8px">${this.escapeHtml(input.message)}</div>`,
      sections,
      "</div>",
      "</div>",
      "</body></html>",
    ].join("")
  }

  private extractStringList(value: unknown) {
    if (!Array.isArray(value)) return []
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  }

  private renderListSection(input: {
    title: string
    items: string[]
    locale: AppLocale
    emptyText?: string
  }) {
    if (input.items.length === 0 && input.emptyText === undefined) return ""

    const listHtml =
      input.items.length > 0
        ? `<ul style="margin:6px 0 0 20px">${input.items
            .slice(0, 20)
            .map((item) => `<li>${this.escapeHtml(item)}</li>`)
            .join("")}</ul>`
        : `<div style="margin-top:6px">${this.escapeHtml(input.emptyText ?? "")}</div>`

    const truncatedHtml =
      input.items.length > 20
        ? `<div style="margin-top:6px;color:#64748b">${this.escapeHtml(
            t("notifications.emailListTruncated", { count: input.items.length - 20 }, input.locale),
          )}</div>`
        : ""

    return [
      '<div style="margin-top:14px">',
      `<div style="font-weight:600">${this.escapeHtml(input.title)}</div>`,
      listHtml,
      truncatedHtml,
      "</div>",
    ].join("")
  }

  private renderFailureSection(errorSummaries: ScanErrorSummary[], locale: AppLocale) {
    if (errorSummaries.length === 0) return ""

    return this.renderListSection({
      title: t("notifications.emailFailures", { count: errorSummaries.length }, locale),
      items: errorSummaries.map((item) => {
        const container = item.container ?? t("notifications.unknownContainer", undefined, locale)
        return `${container}: ${item.message}`
      }),
      locale,
    })
  }

  private extractScanErrorSummaries(payload?: GenericNotificationPayload): ScanErrorSummary[] {
    if (!payload || !Array.isArray(payload.errorSummaries)) return []

    const summaries: ScanErrorSummary[] = []
    for (const item of payload.errorSummaries) {
      if (!item || typeof item !== "object") continue
      const summary = item as { container?: unknown; message?: unknown }
      if (typeof summary.message !== "string" || summary.message.trim().length === 0) continue

      if (typeof summary.container === "string" && summary.container.trim().length > 0) {
        summaries.push({ container: summary.container, message: summary.message })
      } else {
        summaries.push({ message: summary.message })
      }
    }

    return summaries
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  private extractScanMeta(payload?: GenericNotificationPayload, locale?: AppLocale) {
    const firstError = this.extractFirstScanError(payload, locale)
    return {
      mode: typeof payload?.mode === "string" ? payload.mode : "scan_only",
      scanned: typeof payload?.scanned === "number" ? payload.scanned : 0,
      queued: typeof payload?.queued === "number" ? payload.queued : 0,
      errors: typeof payload?.errors === "number" ? payload.errors : firstError ? 1 : 0,
      updates: Array.isArray(payload?.updateCandidates) ? payload.updateCandidates.length : 0,
      firstError,
    }
  }

  private extractFirstScanError(payload?: GenericNotificationPayload, locale?: AppLocale): ScanErrorSummary | null {
    if (!payload) return null

    if (Array.isArray(payload.errorSummaries)) {
      for (const item of payload.errorSummaries) {
        if (!item || typeof item !== "object") continue
        const summary = item as { container?: unknown; message?: unknown }
        if (typeof summary.message !== "string" || summary.message.trim().length === 0) continue

        return {
          container: typeof summary.container === "string" ? summary.container : undefined,
          message: summary.message,
        }
      }
    }

    const container =
      typeof payload.container === "string"
        ? payload.container
        : typeof payload.name === "string"
          ? payload.name
          : undefined

    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return { container, message: payload.error }
    }

    if (typeof payload.reason === "string" && payload.reason.trim().length > 0) {
      return { container, message: this.formatScanReason(payload.reason, locale) }
    }

    return null
  }

  private formatScanReason(reason: string, locale?: AppLocale) {
    switch (reason) {
      case "registry_auth_required":
        return t("notifications.scanReason.registryAuthRequired", undefined, locale)
      case "remote_digest_error":
        return t("notifications.scanReason.remoteDigestError", undefined, locale)
      case "remote_digest_not_found":
        return t("notifications.scanReason.remoteDigestNotFound", undefined, locale)
      case "local_image_missing":
        return t("notifications.scanReason.localImageMissing", undefined, locale)
      case "local_digest_error":
        return t("notifications.scanReason.localDigestError", undefined, locale)
      case "local_repo_digests_empty":
        return t("notifications.scanReason.localRepoDigestsEmpty", undefined, locale)
      default:
        return reason
    }
  }

  private async resolveLocale(locale?: AppLocale) {
    if (locale) return locale

    const currentLocale = getCurrentLocale()
    if (currentLocale) return currentLocale

    return this.settings.getCachedDefaultLocale()
  }
}
