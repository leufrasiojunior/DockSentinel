import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import * as argon2 from "argon2"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { SettingsRepository, type RegistryCredentialRow } from "./settings.repository"
import { CryptoService } from "../crypto/crypto.service"
import type { UpdateSettingsDto } from "./dto/update-settings.dto"
import type {
  CreateRegistryCredentialDto,
  SafeRegistryCredentialDto,
  UpdateRegistryCredentialDto,
} from "./dto/registry-credential.dto"
import { ConfigService } from "@nestjs/config"
import { Env } from "../config/env.schema"
import { MailService } from "../mail/mail.service"
import type { SmtpTestDto } from "./dto/smtp-test.dto"
import { DEFAULT_LOCALE, type AppLocale, normalizeLocale } from "../i18n/locale"
import { t } from "../i18n/translate"
import {
  normalizeServerAddress,
  type RegistryAuthEntry,
} from "../docker/registry-auth.util"

type AuthMode = Env["AUTH_MODE"]
const isAuthMode = (value: unknown): value is AuthMode =>
  value === "none" || value === "password" || value === "totp" || value === "both"
const isAppLocale = (value: unknown): value is AppLocale =>
  value === "pt-BR" || value === "en-US"

const VERSION_CHECK_CACHE_TTL_MS = 15 * 60 * 1000
const SERVER_GITHUB_REPO = "leufrasiojunior/DockSentinel"
const AGENT_GITHUB_REPO = "leufrasiojunior/DockSentinelAgent"
const AGENT_UPDATE_COMMAND =
  "docker pull leufrasiojunior/docksentinelagent:latest && docker rm -f docksentinel-agent >/dev/null 2>&1 || true && docker run -d --name docksentinel-agent --restart unless-stopped -p 45873:45873 -e PORT=45873 -v /var/run/docker.sock:/var/run/docker.sock -v /opt/docksentinel-agent:/var/lib/docksentinel-agent leufrasiojunior/docksentinelagent:latest"

export type SystemVersionCheckResult = {
  checkedAt: string
  server: {
    currentVersion: string
    latestVersion: string | null
    hasUpdate: boolean
    releaseUrl: string
  }
  agent: {
    latestVersion: string | null
    releaseUrl: string
    updateCommand: string
  }
}

export function cleanSemverString(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null
  const cleaned = raw.trim().replace(/^v/i, "")
  if (!/^\d+\.\d+\.\d+/.test(cleaned)) return null
  return cleaned
}

export function isNewerSemver(
  currentRaw?: string | null,
  latestRaw?: string | null,
): boolean {
  const current = cleanSemverString(currentRaw)
  const latest = cleanSemverString(latestRaw)
  if (!current || !latest) return false

  const curMatch = current.match(/^(\d+)\.(\d+)\.(\d+)/)
  const latMatch = latest.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!curMatch || !latMatch) return false

  const curParts = [Number(curMatch[1]), Number(curMatch[2]), Number(curMatch[3])]
  const latParts = [Number(latMatch[1]), Number(latMatch[2]), Number(latMatch[3])]

  for (let i = 0; i < 3; i++) {
    if (latParts[i] > curParts[i]) return true
    if (latParts[i] < curParts[i]) return false
  }
  return false
}

/**
 * SettingsService:
 * - fonte da verdade das configs globais (DB)
 * - aplica regras (hash senha, crypto, etc)
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name)
  private defaultLocaleCache: AppLocale = DEFAULT_LOCALE
  private defaultLocaleInitialized = false
  private versionCheckCache: {
    data: SystemVersionCheckResult
    expiresAt: number
  } | null = null

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
    this.updateDefaultLocaleCache(defaultLocale)

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

  getCachedDefaultLocale(): AppLocale {
    return this.defaultLocaleCache
  }

  async initializeDefaultLocaleCache(): Promise<AppLocale> {
    try {
      const row = await this.repo.get()
      const defaultLocale = isAppLocale(row?.defaultLocale) ? row.defaultLocale : DEFAULT_LOCALE
      this.updateDefaultLocaleCache(defaultLocale)
      return defaultLocale
    } catch {
      this.defaultLocaleInitialized = true
      return this.defaultLocaleCache
    }
  }

  async getDefaultLocale(): Promise<AppLocale> {
    if (!this.defaultLocaleInitialized) {
      await this.initializeDefaultLocaleCache()
    }

    return this.defaultLocaleCache
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
      this.updateDefaultLocaleCache(patch.defaultLocale)
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

  private updateDefaultLocaleCache(locale: AppLocale) {
    this.defaultLocaleCache = locale
    this.defaultLocaleInitialized = true
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

  private toSafeRegistry(row: RegistryCredentialRow): SafeRegistryCredentialDto {
    return {
      id: row.id,
      name: row.name,
      serverAddress: row.serverAddress,
      username: row.username,
      hasPassword: Boolean(row.passwordEnc),
      enabled: Boolean(row.enabled),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async listRegistries(): Promise<SafeRegistryCredentialDto[]> {
    const rows = await this.repo.listRegistries()
    return rows.map((row) => this.toSafeRegistry(row))
  }

  async createRegistry(
    dto: CreateRegistryCredentialDto,
  ): Promise<SafeRegistryCredentialDto> {
    const name = dto.name?.trim()
    const rawServer = dto.serverAddress?.trim()
    const username = dto.username?.trim()
    const password = dto.password?.trim()

    if (!name || !rawServer || !username || !password) {
      throw new BadRequestException("Name, serverAddress, username and password are required")
    }

    const serverAddress = normalizeServerAddress(rawServer)
    const existing = await this.repo.findRegistryByServerAddress(serverAddress)
    if (existing) {
      throw new BadRequestException(`Registry credential already exists for ${serverAddress}`)
    }

    const created = await this.repo.createRegistry({
      name,
      serverAddress,
      username,
      passwordEnc: this.crypto.encrypt(password),
      enabled: dto.enabled ?? true,
    })

    return this.toSafeRegistry(created)
  }

  async updateRegistry(
    id: string,
    dto: UpdateRegistryCredentialDto,
  ): Promise<SafeRegistryCredentialDto> {
    const current = await this.repo.findRegistryById(id)
    if (!current) {
      throw new NotFoundException(`Registry credential not found: ${id}`)
    }

    const name = dto.name !== undefined ? dto.name.trim() : current.name
    const serverAddress =
      dto.serverAddress !== undefined
        ? normalizeServerAddress(dto.serverAddress)
        : current.serverAddress
    const username =
      dto.username !== undefined ? dto.username.trim() : current.username
    const passwordEnc =
      dto.password && dto.password.trim().length > 0
        ? this.crypto.encrypt(dto.password.trim())
        : current.passwordEnc
    const enabled =
      typeof dto.enabled === "boolean" ? dto.enabled : Boolean(current.enabled)

    if (!name || !serverAddress || !username) {
      throw new BadRequestException("Name, serverAddress and username cannot be empty")
    }

    if (serverAddress !== current.serverAddress) {
      const conflict = await this.repo.findRegistryByServerAddress(serverAddress)
      if (conflict && conflict.id !== id) {
        throw new BadRequestException(`Registry credential already exists for ${serverAddress}`)
      }
    }

    const updated = await this.repo.updateRegistry(id, {
      name,
      serverAddress,
      username,
      passwordEnc,
      enabled,
    })

    return this.toSafeRegistry(updated)
  }

  async deleteRegistry(id: string): Promise<{ ok: true }> {
    const current = await this.repo.findRegistryById(id)
    if (!current) {
      throw new NotFoundException(`Registry credential not found: ${id}`)
    }
    await this.repo.deleteRegistry(id)
    return { ok: true as const }
  }

  async getEnabledRegistryAuthEntries(): Promise<RegistryAuthEntry[]> {
    try {
      const rows = await this.repo.listRegistries()
      const entries: RegistryAuthEntry[] = []
      for (const row of rows) {
        if (!row.enabled || !row.passwordEnc) continue
        try {
          const password = this.crypto.decrypt(row.passwordEnc)
          entries.push({
            serveraddress: row.serverAddress,
            username: row.username,
            password,
          })
        } catch (err) {
          this.logger.warn(`Failed to decrypt registry credential ${row.serverAddress}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      return entries
    } catch {
      return []
    }
  }

  private resolveCurrentServerVersion(): string {
    const envVersion = process.env.APP_VERSION?.trim()
    if (envVersion && envVersion !== "dev") {
      return envVersion.replace(/^v/i, "")
    }

    const candidates = [
      resolve(process.cwd(), "../../package.json"),
      resolve(process.cwd(), "package.json"),
    ]
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(readFileSync(candidate, "utf8")) as {
          name?: string
          version?: string
        }
        if (
          parsed?.version &&
          parsed.version !== "0.0.1" &&
          parsed.version !== "0.0.0"
        ) {
          return parsed.version.trim().replace(/^v/i, "")
        }
      } catch {
        // continua tentando
      }
    }

    return process.env.npm_package_version?.trim() || "dev"
  }

  private async fetchGithubLatestRelease(repo: string): Promise<{
    latestVersion: string | null
    releaseUrl: string
  }> {
    const defaultUrl = `https://github.com/${repo}/releases`
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "DockSentinel-UpdateChecker",
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo}/releases/latest`,
        {
          headers,
          signal: AbortSignal.timeout(5000),
        },
      )

      if (response.ok) {
        const body = (await response.json()) as {
          tag_name?: string
          html_url?: string
        }
        return {
          latestVersion: cleanSemverString(body.tag_name),
          releaseUrl: body.html_url || defaultUrl,
        }
      }

      if (response.status === 404) {
        const tagsRes = await fetch(
          `https://api.github.com/repos/${repo}/tags?per_page=1`,
          {
            headers,
            signal: AbortSignal.timeout(5000),
          },
        )
        if (tagsRes.ok) {
          const tags = (await tagsRes.json()) as Array<{ name?: string }>
          const latestTag = tags[0]?.name
          return {
            latestVersion: cleanSemverString(latestTag),
            releaseUrl: latestTag
              ? `https://github.com/${repo}/releases/tag/${latestTag}`
              : defaultUrl,
          }
        }
      }
    } catch (error: unknown) {
      this.logger.debug(
        `Failed to fetch GitHub release for ${repo}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    return { latestVersion: null, releaseUrl: defaultUrl }
  }

  async checkSystemVersions(forceRefresh = false): Promise<SystemVersionCheckResult> {
    const now = Date.now()
    if (
      !forceRefresh &&
      this.versionCheckCache &&
      this.versionCheckCache.expiresAt > now
    ) {
      return this.versionCheckCache.data
    }

    const currentServerVersion = this.resolveCurrentServerVersion()
    const [serverRelease, agentRelease] = await Promise.all([
      this.fetchGithubLatestRelease(SERVER_GITHUB_REPO),
      this.fetchGithubLatestRelease(AGENT_GITHUB_REPO),
    ])

    const result: SystemVersionCheckResult = {
      checkedAt: new Date().toISOString(),
      server: {
        currentVersion: currentServerVersion,
        latestVersion: serverRelease.latestVersion,
        hasUpdate: isNewerSemver(currentServerVersion, serverRelease.latestVersion),
        releaseUrl: serverRelease.releaseUrl,
      },
      agent: {
        latestVersion: agentRelease.latestVersion,
        releaseUrl: agentRelease.releaseUrl,
        updateCommand: AGENT_UPDATE_COMMAND,
      },
    }

    this.versionCheckCache = {
      data: result,
      expiresAt: Date.now() + VERSION_CHECK_CACHE_TTL_MS,
    }

    return result
  }
}
