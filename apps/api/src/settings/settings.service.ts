import { BadRequestException, Injectable, Logger } from "@nestjs/common"
import * as argon2 from "argon2"
import { SettingsRepository } from "./settings.repository"
import { CryptoService } from "../crypto/crypto.service"
import type { UpdateSettingsDto } from "./dto/update-settings.dto"
import { ConfigService } from "@nestjs/config"
import { Env } from "../config/env.schema"
import { MailService } from "../mail/mail.service"
import type { SmtpTestDto } from "./dto/smtp-test.dto"
import { DEFAULT_LOCALE, type AppLocale, normalizeLocale } from "../i18n/locale"
import { t } from "../i18n/translate"

type AuthMode = Env["AUTH_MODE"]
const isAuthMode = (value: unknown): value is AuthMode =>
  value === "none" || value === "password" || value === "totp" || value === "both"
const isAppLocale = (value: unknown): value is AppLocale =>
  value === "pt-BR" || value === "en-US"

/**
 * SettingsService:
 * - fonte da verdade das configs globais (DB)
 * - aplica regras (hash senha, crypto, etc)
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name)
  private defaultLocaleCache: AppLocale = DEFAULT_LOCALE

  constructor(
    private readonly repo: SettingsRepository,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService<Env>,
    private readonly mail: MailService,
  ) {}

  /**
   * Retorna settings “seguros” para UI:
   * - sem hashes e sem secrets
   */
  async getSafeSettings() {
    const row = await this.repo.get()
    const defaultLocale = isAppLocale(row?.defaultLocale) ? row.defaultLocale : DEFAULT_LOCALE
    this.defaultLocaleCache = defaultLocale

    return {
      authMode: isAuthMode(row?.authMode) ? row.authMode : "none",
      logLevel: row?.logLevel ?? "info",
      defaultLocale,
      // flags úteis para UI
      hasPassword: Boolean(row?.adminPasswordHash),
      hasTotp: Boolean(row?.totpSecretEnc),
      notificationsInAppEnabled: row?.notificationsInAppEnabled ?? true,
      notificationsEmailEnabled: row?.notificationsEmailEnabled ?? false,
      notificationLevel: row?.notificationLevel === "errors_only" ? "errors_only" : "all",
      notificationReadRetentionDays: row?.notificationReadRetentionDays ?? 15,
      notificationUnreadRetentionDays: row?.notificationUnreadRetentionDays ?? 60,
      environmentHealthcheckIntervalMin: row?.environmentHealthcheckIntervalMin ?? 5,
      notificationRecipientEmail: row?.notificationRecipientEmail ?? null,
      smtpHost: row?.smtpHost ?? null,
      smtpPort: row?.smtpPort ?? null,
      smtpSecureMode: row?.smtpSecureMode === "tls" ? "tls" : "starttls",
      smtpUsername: row?.smtpUsername ?? null,
      hasSmtpPassword: Boolean(row?.smtpPasswordEnc),
      smtpFromName: row?.smtpFromName ?? null,
      smtpFromEmail: row?.smtpFromEmail ?? null,
      createdAt: row?.createdAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    }
  }

  async getRawSettings() {
    return this.repo.get()
  }

  async getDefaultLocale(): Promise<AppLocale> {
    try {
      const row = await this.repo.get()
      const defaultLocale = isAppLocale(row?.defaultLocale) ? row.defaultLocale : this.defaultLocaleCache
      this.defaultLocaleCache = defaultLocale
      return defaultLocale
    } catch {
      return this.defaultLocaleCache
    }
  }

  /**
   * Atualiza settings globais no DB (singleton).
   * - Se adminPassword vier, gera hash e salva.
   * - Se totpSecret vier, criptografa e salva.
   */
  async updateSettings(dto: UpdateSettingsDto) {
    const row = await this.repo.get()
    const currentAuthMode = isAuthMode(row?.authMode) ? row.authMode : "none"
    const nextAuthMode = dto.authMode ?? currentAuthMode

    const willHavePassword = Boolean(dto.adminPassword) || Boolean(row?.adminPasswordHash)
    const willHaveTotp = Boolean(dto.totpSecret) || Boolean(row?.totpSecretEnc)

    if ((nextAuthMode === "password" || nextAuthMode === "both") && !willHavePassword) {
      throw new BadRequestException(t("settings.passwordRequired"))
    }

    if ((nextAuthMode === "totp" || nextAuthMode === "both") && !willHaveTotp) {
      throw new BadRequestException(t("settings.totpRequired"))
    }

    const patch: {
      authMode?: string
      logLevel?: string
      defaultLocale?: AppLocale
      adminPasswordHash?: string | null
      totpSecretEnc?: string | null
      notificationsInAppEnabled?: boolean
      notificationsEmailEnabled?: boolean
      notificationLevel?: "all" | "errors_only"
      notificationReadRetentionDays?: number
      notificationUnreadRetentionDays?: number
      environmentHealthcheckIntervalMin?: number
      notificationRecipientEmail?: string | null
      smtpHost?: string | null
      smtpPort?: number | null
      smtpSecureMode?: "starttls" | "tls"
      smtpUsername?: string | null
      smtpPasswordEnc?: string | null
      smtpFromName?: string | null
      smtpFromEmail?: string | null
    } = {}

    if (dto.authMode) patch.authMode = dto.authMode
    if (dto.logLevel) patch.logLevel = dto.logLevel
    if (dto.defaultLocale) patch.defaultLocale = this.validateLocale(dto.defaultLocale)

    if (dto.adminPassword) {
      patch.adminPasswordHash = await argon2.hash(dto.adminPassword)
      this.logger.log("Admin password hash updated")
    }

    if (dto.totpSecret) {
      patch.totpSecretEnc = this.crypto.encrypt(dto.totpSecret)
      this.logger.log("TOTP secret updated (encrypted)")
    }

    if (typeof dto.notificationsInAppEnabled === "boolean") {
      patch.notificationsInAppEnabled = dto.notificationsInAppEnabled
    }
    if (typeof dto.notificationsEmailEnabled === "boolean") {
      patch.notificationsEmailEnabled = dto.notificationsEmailEnabled
    }
    if (dto.notificationLevel !== undefined) {
      patch.notificationLevel = dto.notificationLevel
    }
    if (dto.notificationReadRetentionDays !== undefined) {
      patch.notificationReadRetentionDays = this.validateRetentionDays(
        "notificationReadRetentionDays",
        dto.notificationReadRetentionDays,
      )
    }
    if (dto.notificationUnreadRetentionDays !== undefined) {
      patch.notificationUnreadRetentionDays = this.validateRetentionDays(
        "notificationUnreadRetentionDays",
        dto.notificationUnreadRetentionDays,
      )
    }
    if (dto.environmentHealthcheckIntervalMin !== undefined) {
      patch.environmentHealthcheckIntervalMin = this.validateEnvironmentHealthcheckInterval(
        dto.environmentHealthcheckIntervalMin,
      )
    }
    if (dto.notificationRecipientEmail !== undefined) {
      patch.notificationRecipientEmail = dto.notificationRecipientEmail?.trim() || null
    }
    if (dto.smtpHost !== undefined) patch.smtpHost = dto.smtpHost?.trim() || null
    if (dto.smtpPort !== undefined) patch.smtpPort = dto.smtpPort ?? null
    if (dto.smtpSecureMode !== undefined) patch.smtpSecureMode = dto.smtpSecureMode
    if (dto.smtpUsername !== undefined) patch.smtpUsername = dto.smtpUsername?.trim() || null
    if (dto.smtpFromName !== undefined) patch.smtpFromName = dto.smtpFromName?.trim() || null
    if (dto.smtpFromEmail !== undefined) patch.smtpFromEmail = dto.smtpFromEmail?.trim() || null
    if (!patch.smtpFromName && !row?.smtpFromName) patch.smtpFromName = "DockSentinel"
    if (dto.smtpPassword !== undefined && dto.smtpPassword.trim().length > 0) {
      patch.smtpPasswordEnc = this.crypto.encrypt(dto.smtpPassword)
    }

    // destinatário = próprio usuário (fromEmail), conforme requisito
    if (patch.smtpFromEmail !== undefined) {
      patch.notificationRecipientEmail = patch.smtpFromEmail
    }

    const nextEmailEnabled =
      patch.notificationsEmailEnabled ?? row?.notificationsEmailEnabled ?? false
    const nextRecipient =
      patch.notificationRecipientEmail ?? patch.smtpFromEmail ?? row?.smtpFromEmail ?? null
    const nextHost = patch.smtpHost ?? row?.smtpHost ?? null
    const nextPort = patch.smtpPort ?? row?.smtpPort ?? null
    const nextFrom = patch.smtpFromEmail ?? row?.smtpFromEmail ?? null
    const nextUser = patch.smtpUsername ?? row?.smtpUsername ?? null
    const nextPwd =
      patch.smtpPasswordEnc !== undefined ? patch.smtpPasswordEnc : row?.smtpPasswordEnc

    if (nextEmailEnabled) {
      if (!nextRecipient) {
        throw new BadRequestException(t("settings.smtpFromRequired"))
      }
      if (!nextHost || !nextPort || !nextFrom) {
        throw new BadRequestException(t("settings.smtpRequiredWhenEmailEnabled"))
      }
      // Para o MVP: exigimos username + password para evitar configurações ambíguas.
      if (!nextUser || !nextPwd) {
        throw new BadRequestException(t("settings.smtpCredentialsRequired"))
      }
    }

    await this.repo.upsert(patch)
    if (patch.defaultLocale) {
      this.defaultLocaleCache = patch.defaultLocale
    }

    // devolve o “safe settings” atualizado
    return this.getSafeSettings()
  }

  async getAuthMode(): Promise<AuthMode> {
    try {
      const row = await this.repo.get()
      if (isAuthMode(row?.authMode)) {
        return row.authMode
      }

      // primeira configuração: sem linha no DB, libera fluxo inicial
      return "none"
    } catch {
      // fallback de boot quando o DB ainda não está acessível.
      this.logger.warn("DB not ready for settings yet; falling back to ENV")
      const fromEnv = this.config.get("AUTH_MODE", { infer: true })
      return isAuthMode(fromEnv) ? fromEnv : "none"
    }
  }

  async testSmtp(dto?: SmtpTestDto) {
    const row = await this.repo.get()
    const recipient = dto?.smtpFromEmail?.trim() || row?.smtpFromEmail
    const host = dto?.smtpHost?.trim() || row?.smtpHost
    const port = dto?.smtpPort ?? row?.smtpPort
    const secureMode = dto?.smtpSecureMode ?? (row?.smtpSecureMode === "tls" ? "tls" : "starttls")
    const username = dto?.smtpUsername?.trim() || row?.smtpUsername
    const fromEmail = dto?.smtpFromEmail?.trim() || row?.smtpFromEmail
    const fromName =
      dto?.smtpFromName !== undefined
        ? dto.smtpFromName?.trim() || "DockSentinel"
        : row?.smtpFromName || "DockSentinel"

    let password: string | null = null
    if (dto?.smtpPassword && dto.smtpPassword.trim().length > 0) {
      password = dto.smtpPassword
    } else if (row?.smtpPasswordEnc) {
      password = this.crypto.decrypt(row.smtpPasswordEnc)
    }

    if (!recipient || !host || !port || !fromEmail || !username || !password) {
      throw new BadRequestException(t("settings.smtpIncomplete"))
    }

    const locale = await this.getDefaultLocale()

    await this.mail.send(
      {
        host,
        port,
        secureMode,
        username,
        password,
        fromName,
        fromEmail,
      },
      {
        to: recipient,
        subject: t("settings.smtpTestSubject", undefined, locale),
        html: `<html><body><h2>${t("settings.smtpTestHeading", undefined, locale)}</h2><p>${t("settings.smtpTestSuccess", undefined, locale)}</p></body></html>`,
      },
    )
    return { ok: true as const }
  }

  private validateRetentionDays(field: string, value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new BadRequestException(t("settings.retentionFinite", { field }))
    }
    const days = Math.floor(value)
    if (days < 1 || days > 3650) {
      throw new BadRequestException(t("settings.retentionRange", { field }))
    }
    return days
  }

  private validateLocale(value: unknown): AppLocale {
    const locale = normalizeLocale(value)
    return locale ?? DEFAULT_LOCALE
  }

  private validateEnvironmentHealthcheckInterval(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new BadRequestException(t("settings.environmentHealthcheckIntervalFinite"))
    }

    const minutes = Math.floor(value)
    if (minutes < 1 || minutes > 1440) {
      throw new BadRequestException(t("settings.environmentHealthcheckIntervalRange"))
    }

    return minutes
  }
}
