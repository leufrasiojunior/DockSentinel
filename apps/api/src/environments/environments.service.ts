import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import Docker from "dockerode"
import { randomBytes, randomUUID } from "node:crypto"
import { CryptoService } from "../crypto/crypto.service"
import { Env } from "../config/env.schema"
import { DOCKER_CLIENT } from "../docker/docker.constants"
import { NotificationsService } from "../notifications/notifications.service"
import { UpdatesRepository } from "../updates/updates.repository"
import { UpdatesSchedulerRepository } from "../updates/updates.scheduler.repository"
import { t } from "../i18n/translate"
import {
  AGENT_DEFAULT_PORT,
  ENVIRONMENT_ROTATION_STATES,
  type EnvironmentRotationState,
  LOCAL_ENVIRONMENT_ID,
  LOCAL_ENVIRONMENT_NAME,
} from "./environment.constants"
import type {
  AgentInfoDto,
  CreateRemoteEnvironmentInput,
  EnvironmentDto,
  RemoteEnvironmentRotationStatusDto,
  RemoteEnvironmentSetupStatusDto,
  RemoteEnvironmentSetupTimeoutInput,
  UpdateRemoteEnvironmentInput,
} from "./dto/environment.dto"
import { EnvironmentsRepository } from "./environments.repository"

type EnvironmentRow = Awaited<ReturnType<EnvironmentsRepository["findById"]>>
type ProbeOptions = {
  notifyOnOffline: boolean
  throwOnFailure: boolean
}
type AgentSetupStatusPayload = {
  state?: EnvironmentRotationState
}
type SetupPhase = "waiting_for_agent" | "waiting_for_token" | "ready_to_complete" | "blocked"
type SetupBlockingReason = "agent_already_paired"
type TranslationParams = Record<string, string | number | boolean | null | undefined>

@Injectable()
export class EnvironmentsService implements OnModuleInit {
  private readonly logger = new Logger(EnvironmentsService.name)

  constructor(
    private readonly repo: EnvironmentsRepository,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService<Env>,
    private readonly updatesRepo: UpdatesRepository,
    private readonly schedulerRepo: UpdatesSchedulerRepository,
    private readonly notifications: NotificationsService,
    @Inject(DOCKER_CLIENT) private readonly docker: Docker,
  ) {}

  async onModuleInit() {
    await this.repo.ensureLocalEnvironment()
    await this.schedulerRepo.ensureEnvironmentConfig(LOCAL_ENVIRONMENT_ID, LOCAL_ENVIRONMENT_NAME)
  }

  async listEnvironments() {
    await this.repo.ensureLocalEnvironment()
    const items = await this.repo.listAll()
    const localFirst = items
      .filter((item) => this.isVisibleEnvironment(item))
      .sort((a, b) => {
      if (a.id === LOCAL_ENVIRONMENT_ID) return -1
      if (b.id === LOCAL_ENVIRONMENT_ID) return 1
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    return {
      items: localFirst.map((item) => this.toDto(item)),
    }
  }

  async getEnvironmentOrThrow(id: string) {
    if (!id?.trim()) throw new NotFoundException(t("environment.notFound", { id }))
    const env = await this.repo.findById(id)
    if (!env) throw new NotFoundException(t("environment.notFound", { id }))
    return env
  }

  async getEnvironmentNameOrThrow(id: string) {
    const env = await this.getEnvironmentOrThrow(id)
    return env.name
  }

  async createRemoteEnvironment(input: CreateRemoteEnvironmentInput) {
    const limit = this.config.get("REMOTE_ENVIRONMENTS_LIMIT", { infer: true }) ?? 3
    if (limit > 0) {
      const count = await this.repo.countRemote()
      if (count >= limit) {
        throw this.badRequest("environment.limitReached", { limit }, "REMOTE_ENVIRONMENT_LIMIT_REACHED")
      }
    }

    const name = input.name.trim()
    const baseUrl = this.normalizeBaseUrl(input.baseUrl)
    await this.assertUniqueRemoteName(name)
    await this.assertUniqueRemoteBaseUrl(baseUrl)

    const bootstrapToken = this.generateAgentToken()
    const environment = await this.repo.createRemote({
      id: randomUUID(),
      name,
      baseUrl,
      agentTokenEnc: null,
      pendingBootstrapTokenEnc: this.crypto.encrypt(bootstrapToken),
      rotationState: "ready_to_pair",
    })

    await this.schedulerRepo.ensureEnvironmentConfig(environment.id, environment.name)

    return {
      environment: this.toDto(environment),
      installCommand: this.buildInstallCommand(),
      bootstrapToken,
      setupUrl: this.buildSetupUrl(environment.baseUrl),
    }
  }

  async updateRemoteEnvironment(id: string, patch: UpdateRemoteEnvironmentInput) {
    const current = await this.getEnvironmentOrThrow(id)
    if (current.kind !== "remote") {
      throw this.badRequest("environment.remoteUpdateOnly", undefined, "REMOTE_ENVIRONMENT_REQUIRED")
    }

    const nextName = patch.name?.trim() ?? current.name
    const nextBaseUrl =
      patch.baseUrl !== undefined ? this.normalizeBaseUrl(patch.baseUrl) : current.baseUrl ?? null

    if (nextName !== current.name) {
      await this.assertUniqueRemoteName(nextName, id)
    }
    if (nextBaseUrl && nextBaseUrl !== current.baseUrl) {
      await this.assertUniqueRemoteBaseUrl(nextBaseUrl, id)
    }

    const updated = await this.repo.updateRemote(id, {
      name: nextName,
      baseUrl: nextBaseUrl ?? undefined,
    })

    await this.schedulerRepo.renameEnvironment(id, updated.name)

    return this.toDto(updated)
  }

  async rotateRemoteToken(id: string) {
    const current = await this.getEnvironmentOrThrow(id)
    if (current.kind !== "remote") {
      throw this.badRequest("environment.remoteRotateOnly", undefined, "REMOTE_ENVIRONMENT_REQUIRED")
    }

    let nextState: EnvironmentRotationState = "ready_to_pair"
    if (current.agentTokenEnc && this.normalizeRotationState(current.rotationState) === "paired") {
      const { baseUrl, token: currentCredential } = this.getRemoteAccess(current)

      try {
        await this.requestAgentJson(baseUrl, "/agent/v1/setup/prepare-rotation", currentCredential, {
          method: "POST",
        })
      } catch (error: unknown) {
        this.logger.warn(
          `Failed to prepare remote rotation env=${current.id}: ${this.getErrorMessage(error)}`,
        )
        throw this.badGateway(
          "environment.remoteRotationPrepareFailed",
          undefined,
          "REMOTE_AGENT_ROTATION_PREPARE_FAILED",
        )
      }

      nextState = "pending_rotation"
    }

    const bootstrapToken = this.generateAgentToken()
    const updated = await this.repo.updateRemote(id, {
      pendingBootstrapTokenEnc: this.crypto.encrypt(bootstrapToken),
      rotationState: nextState,
      lastError: null,
    })

    return {
      environment: this.toDto(updated),
      bootstrapToken,
      installCommand: nextState === "ready_to_pair" ? this.buildInstallCommand() : null,
      setupUrl: this.buildSetupUrl(updated.baseUrl),
    }
  }

  async getRemoteSetupStatus(id: string): Promise<RemoteEnvironmentSetupStatusDto> {
    const current = await this.getEnvironmentOrThrow(id)
    if (current.kind !== "remote") {
      throw this.badRequest("environment.remoteSetupStatusOnly", undefined, "REMOTE_ENVIRONMENT_REQUIRED")
    }

    const setupUrl = this.buildSetupUrl(current.baseUrl)
    if (!current.baseUrl) {
      return {
        environment: this.toDto(current),
        agentState: this.normalizeRotationState(current.rotationState),
        phase: "waiting_for_agent",
        readyToComplete: false,
        setupUrl,
        blockingReason: null,
        lastError: t("environment.remoteBaseUrlMissing"),
      }
    }

    try {
      const result = await this.fetchAgentSetupStatus(current.baseUrl)
      const agentState = this.normalizeRotationState(result?.state)
      const currentState = this.normalizeRotationState(current.rotationState)
      const nextState = this.deriveSetupState(
        currentState,
        agentState,
        Boolean(current.pendingBootstrapTokenEnc),
      )
      const phase = this.deriveSetupPhase(current, agentState)
      const blockingReason = this.deriveSetupBlockingReason(current, agentState)

      let nextLastError: string | null = null
      if (blockingReason === "agent_already_paired") {
        nextLastError = t("environment.remoteAgentAlreadyPaired")
      }

      let environment = current
      if (
        environment.rotationState !== nextState ||
        (environment.lastError ?? null) !== nextLastError
      ) {
        environment = await this.repo.updateRemote(environment.id, {
          rotationState: nextState,
          lastError: nextLastError,
        })
      }

      if (
        blockingReason === "agent_already_paired" &&
        (current.lastError ?? null) !== nextLastError &&
        nextLastError
      ) {
        await this.emitSetupFailureNotification(environment, nextLastError)
      }

      return {
        environment: this.toDto(environment),
        agentState,
        phase,
        readyToComplete: agentState === "ready_to_complete",
        setupUrl,
        blockingReason,
        lastError: nextLastError,
      }
    } catch (error: unknown) {
      return {
        environment: this.toDto(current),
        agentState: this.normalizeRotationState(current.rotationState),
        phase: "waiting_for_agent",
        readyToComplete: false,
        setupUrl,
        blockingReason: null,
        lastError: this.getErrorMessage(error),
      }
    }
  }

  async completeRemoteSetup(id: string) {
    const current = await this.getEnvironmentOrThrow(id)
    if (current.kind !== "remote") {
      throw this.badRequest("environment.remoteSetupCompleteOnly", undefined, "REMOTE_ENVIRONMENT_REQUIRED")
    }

    if (!current.pendingBootstrapTokenEnc) {
      if (current.agentTokenEnc && this.normalizeRotationState(current.rotationState) === "paired") {
        return {
          environment: this.toDto(current),
        }
      }

      throw this.badRequest("environment.setupTokenMissing", undefined, "REMOTE_SETUP_TOKEN_MISSING")
    }

    const status = await this.getRemoteSetupStatus(id)
    if (!status.readyToComplete) {
      throw this.badRequest("environment.setupNotReady", undefined, "REMOTE_SETUP_NOT_READY")
    }

    const currentAgain = await this.getEnvironmentOrThrow(id)
    if (currentAgain.kind !== "remote" || !currentAgain.baseUrl || !currentAgain.pendingBootstrapTokenEnc) {
      throw this.badRequest("environment.setupTokenMissing", undefined, "REMOTE_SETUP_TOKEN_MISSING")
    }

    const nextCredential = this.generateAgentToken()
    const bootstrapToken = this.crypto.decrypt(currentAgain.pendingBootstrapTokenEnc)

    try {
      await this.requestAgentJson(
        currentAgain.baseUrl,
        "/agent/v1/setup/complete",
        bootstrapToken,
        {
          method: "POST",
          body: { credential: nextCredential },
        },
      )
    } catch (error: unknown) {
      const message = t("environment.remoteSetupCompleteFailed")
      await this.emitSetupFailureNotification(currentAgain, message)
      this.logger.warn(
        `Failed to complete remote setup env=${currentAgain.id}: ${this.getErrorMessage(error)}`,
      )
      throw this.badGateway(
        "environment.remoteSetupCompleteFailed",
        undefined,
        "REMOTE_AGENT_SETUP_COMPLETE_FAILED",
      )
    }

    let info: AgentInfoDto | null = null
    try {
      info = await this.fetchAgentInfo(currentAgain.baseUrl, nextCredential)
    } catch (error: unknown) {
      this.logger.warn(
        `Setup completed for environment ${currentAgain.id}, but info refresh failed: ${this.getErrorMessage(error)}`,
      )
    }

    const updated = await this.repo.updateRemote(id, {
      agentTokenEnc: this.crypto.encrypt(nextCredential),
      pendingBootstrapTokenEnc: null,
      rotationState: "paired",
      agentVersion: info?.agentVersion ?? currentAgain.agentVersion ?? null,
      dockerVersion: info?.dockerVersion ?? currentAgain.dockerVersion ?? null,
      lastSeenAt: info ? new Date() : currentAgain.lastSeenAt ?? null,
      lastError: null,
      connectivityStatus: info ? "online" : currentAgain.connectivityStatus,
      offlineNotifiedAt: info ? null : currentAgain.offlineNotifiedAt ?? null,
    })

    return {
      environment: this.toDto(updated),
    }
  }

  async reportRemoteSetupTimeout(id: string, input: RemoteEnvironmentSetupTimeoutInput) {
    const current = await this.getEnvironmentOrThrow(id)
    if (current.kind !== "remote") {
      throw this.badRequest(
        "environment.remoteSetupTimeoutOnly",
        undefined,
        "REMOTE_ENVIRONMENT_REQUIRED",
      )
    }

    const flow = input.flow === "rotation" ? "rotation" : "install"
    const suffix = input.lastError?.trim()
      ? t("environment.lastErrorSuffix", { error: input.lastError.trim() })
      : ""
    const message =
      flow === "rotation"
        ? t("environment.rotationTimeout", { name: current.name, details: suffix })
        : t("environment.setupTimeout", { name: current.name, details: suffix })

    await this.emitSetupFailureNotification(current, message)

    return { ok: true as const }
  }

  async getRemoteRotationStatus(id: string): Promise<RemoteEnvironmentRotationStatusDto> {
    return this.getRemoteSetupStatus(id)
  }

  async completeRemoteRotation(id: string) {
    return this.completeRemoteSetup(id)
  }

  async testEnvironment(id: string) {
    const result = await this.probeEnvironmentById(id, {
      notifyOnOffline: false,
      throwOnFailure: true,
    })

    if (!result) {
      const environment = await this.getEnvironmentOrThrow(id)
      throw this.badRequest("environment.testFailed", { name: environment.name }, "ENVIRONMENT_UNREACHABLE")
    }

    return result
  }

  async monitorEnvironment(id: string) {
    await this.probeEnvironmentById(id, {
      notifyOnOffline: true,
      throwOnFailure: false,
    })
  }

  async deleteRemoteEnvironment(id: string) {
    const current = await this.getEnvironmentOrThrow(id)
    if (current.id === LOCAL_ENVIRONMENT_ID || current.kind !== "remote") {
      throw this.badRequest("environment.deleteLocalForbidden", undefined, "LOCAL_ENVIRONMENT_DELETE_FORBIDDEN")
    }

    await this.schedulerRepo.deleteEnvironmentConfig(id)
    await this.updatesRepo.failPendingJobsForEnvironment(
      id,
      `environment_deleted:${current.name}`,
    )
    await this.repo.deleteRemote(id)

    return { ok: true as const }
  }

  async fetchAgentInfoForEnvironment(id: string) {
    const environment = await this.getEnvironmentOrThrow(id)
    if (environment.kind === "local") return this.getLocalInfo()
    const { baseUrl, token } = this.getRemoteAccess(environment)
    return this.fetchAgentInfo(baseUrl, token)
  }

  async getAgentTokenForEnvironment(id: string) {
    const environment = await this.getEnvironmentOrThrow(id)
    if (environment.kind !== "remote" || !environment.agentTokenEnc) {
      return null
    }
    return this.crypto.decrypt(environment.agentTokenEnc)
  }

  normalizeBaseUrl(raw: string) {
    let value = raw.trim()
    if (!value) {
      throw this.badRequest("environment.baseUrlRequired", undefined, "INVALID_BASE_URL")
    }
    if (!/^[a-z]+:\/\//i.test(value)) {
      value = `http://${value}`
    }

    let url: URL
    try {
      url = new URL(value)
    } catch {
      throw this.badRequest(
        "environment.baseUrlInvalid",
        { value: raw, examples: this.baseUrlExamples() },
        "INVALID_BASE_URL",
      )
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw this.badRequest(
        "environment.baseUrlProtocolUnsupported",
        { value: raw, examples: this.baseUrlExamples() },
        "INVALID_BASE_URL",
      )
    }

    const hostError = this.validateHostname(url.hostname)
    if (hostError) {
      throw this.badRequest(
        "environment.baseUrlInvalid",
        { value: raw, examples: `${hostError}. ${this.baseUrlExamples()}` },
        "INVALID_BASE_URL",
      )
    }

    if (!url.port) {
      url.port = String(AGENT_DEFAULT_PORT)
    }

    const normalizedPath = url.pathname.replace(/\/+$/, "")
    url.pathname = normalizedPath || "/"

    const path = url.pathname === "/" ? "" : url.pathname
    return `${url.origin}${path}`
  }

  private async getLocalInfo(): Promise<AgentInfoDto> {
    const version = await this.docker.version()
    return {
      mode: "agent",
      agentVersion: this.resolveAppVersion(),
      dockerVersion: version.Version ?? null,
      dockerApiVersion: version.ApiVersion ?? null,
      dockerHost: version.Os ?? null,
    }
  }

  private async fetchAgentInfo(baseUrl: string, token: string): Promise<AgentInfoDto> {
    return this.requestAgentJson<AgentInfoDto>(baseUrl, "/agent/v1/info", token)
  }

  private generateAgentToken() {
    return `dsa_${randomBytes(24).toString("base64url")}`
  }

  private buildInvalidBaseUrlMessage(raw: string, normalized: string) {
    const inferred = this.inferHostError(normalized)
    if (inferred) {
      return t("environment.baseUrlInvalid", {
        value: raw,
        examples: `${inferred}. ${this.baseUrlExamples()}`,
      })
    }

    return t("environment.baseUrlInvalid", {
      value: raw,
      examples: this.baseUrlExamples(),
    })
  }

  private inferHostError(value: string) {
    const withoutProtocol = value.replace(/^[a-z]+:\/\//i, "")
    const hostPort = withoutProtocol.split("/")[0] ?? ""
    if (!hostPort) {
      return t("environment.baseUrlHostMissing")
    }

    if (hostPort.startsWith("[") && hostPort.includes("]")) {
      return null
    }

    const host = hostPort.replace(/:\d+$/, "")
    return this.validateHostname(host)
  }

  private validateHostname(hostname: string) {
    const host = hostname.trim()
    if (!host) {
      return t("environment.baseUrlHostMissing")
    }

    if (!/^\d+(?:\.\d+)+$/.test(host)) {
      return null
    }

    const octets = host.split(".")
    if (octets.length !== 4) {
      return t("environment.baseUrlIpv4Blocks", { host, count: octets.length })
    }

    for (const octet of octets) {
      const value = Number(octet)
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        return t("environment.baseUrlIpv4Range", { block: octet })
      }
    }

    return null
  }

  private baseUrlExamples() {
    return t("environment.baseUrlExamples")
  }

  private buildInstallCommand() {
    const runCommand = [
      "docker run -d",
      "--name docksentinel-agent",
      "--restart unless-stopped",
      `-p ${AGENT_DEFAULT_PORT}:${AGENT_DEFAULT_PORT}`,
      `-e PORT=${AGENT_DEFAULT_PORT}`,
      "-v /var/run/docker.sock:/var/run/docker.sock",
      "-v /opt/docksentinel-agent:/var/lib/docksentinel-agent",
      "leufrasiojunior/docksentinelagent:latest",
    ].join(" ")

    return `docker rm -f docksentinel-agent >/dev/null 2>&1 || true && ${runCommand}`
  }

  private buildSetupUrl(baseUrl?: string | null) {
    if (!baseUrl) return null
    return `${baseUrl}/setup`
  }

  private async assertUniqueRemoteName(name: string, exceptId?: string) {
    const existing = await this.repo.findByName(name)
    if (existing && existing.id !== exceptId) {
      throw this.badRequest("environment.nameExists", { name }, "ENVIRONMENT_NAME_CONFLICT")
    }
  }

  private async assertUniqueRemoteBaseUrl(baseUrl: string, exceptId?: string) {
    const existing = await this.repo.findRemoteByBaseUrl(baseUrl)
    if (existing && existing.id !== exceptId) {
      throw this.badRequest("environment.urlExists", { baseUrl }, "ENVIRONMENT_URL_CONFLICT")
    }
  }

  private toDto(environment: NonNullable<EnvironmentRow>): EnvironmentDto {
    return {
      id: environment.id,
      kind: environment.kind === "remote" ? "remote" : "local",
      name: environment.name,
      baseUrl: environment.baseUrl ?? null,
      hasToken: Boolean(environment.agentTokenEnc),
      rotationState: this.normalizeRotationState(environment.rotationState),
      agentVersion: environment.agentVersion ?? null,
      dockerVersion: environment.dockerVersion ?? null,
      lastSeenAt: environment.lastSeenAt ?? null,
      lastError: environment.lastError ?? null,
      status:
        environment.kind === "local" || environment.connectivityStatus === "online"
          ? "online"
          : "offline",
      createdAt: environment.createdAt,
      updatedAt: environment.updatedAt,
    }
  }

  private resolveAppVersion() {
    return process.env.APP_VERSION ?? process.env.npm_package_version ?? "dev"
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof HttpException) {
      const response = error.getResponse()
      if (typeof response === "string") return response
      if (response && typeof response === "object") {
        const maybeMessage = (response as { message?: unknown }).message
        if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
          return maybeMessage
        }
      }
    }
    if (error instanceof Error) return error.message
    return String(error)
  }

  private async probeEnvironmentById(id: string, options: ProbeOptions) {
    const environment = await this.getEnvironmentOrThrow(id)
    return this.probeEnvironment(environment, options)
  }

  private async probeEnvironment(
    environment: NonNullable<EnvironmentRow>,
    options: ProbeOptions,
  ): Promise<{ environment: EnvironmentDto; info: AgentInfoDto } | null> {
    if (environment.kind === "local") {
      const info = await this.getLocalInfo()
      const now = new Date()
      const updated = await this.repo.updateHealth(environment.id, {
        agentVersion: info.agentVersion,
        dockerVersion: info.dockerVersion ?? null,
        rotationState: this.normalizeRotationState(environment.rotationState),
        lastSeenAt: now,
        lastError: null,
        connectivityStatus: "online",
        offlineNotifiedAt: null,
      })

      return {
        environment: this.toDto(updated),
        info,
      }
    }

    if (!environment.baseUrl) {
      const message = t("environment.remoteBaseUrlMissing")
      await this.repo.updateHealth(environment.id, {
        lastError: message,
        connectivityStatus: "offline",
      })

      if (options.throwOnFailure) {
        throw this.badRequest("environment.remoteBaseUrlMissing", undefined, "REMOTE_ENVIRONMENT_BASE_URL_MISSING")
      }

      return null
    }

    if (!environment.agentTokenEnc) {
      if (this.isWaitingInitialSetup(environment)) {
        return null
      }

      const message = t("environment.remoteCredentialMissing")
      await this.repo.updateHealth(environment.id, {
        lastError: message,
        connectivityStatus: "offline",
      })

      if (options.throwOnFailure) {
        throw this.badRequest(
          "environment.remoteCredentialMissing",
          undefined,
          "REMOTE_ENVIRONMENT_CREDENTIAL_MISSING",
        )
      }

      return null
    }

    try {
      const access = this.getRemoteAccess(environment)
      const info = await this.fetchAgentInfo(access.baseUrl, access.token)
      const now = new Date()
      const updated = await this.repo.updateHealth(environment.id, {
        agentVersion: info.agentVersion,
        dockerVersion: info.dockerVersion ?? null,
        rotationState: this.normalizeRotationState(environment.rotationState),
        lastSeenAt: now,
        lastError: null,
        connectivityStatus: "online",
        offlineNotifiedAt: null,
      })

      return {
        environment: this.toDto(updated),
        info,
      }
    } catch (error: unknown) {
      const message = this.getErrorMessage(error)
      const updated = await this.repo.updateHealth(environment.id, {
        lastError: message,
        connectivityStatus: "offline",
      })

      if (options.notifyOnOffline && (environment.connectivityStatus !== "offline" || !environment.offlineNotifiedAt)) {
        await this.notifications.emitEnvironmentOffline(updated.name, message, {
          environmentId: updated.id,
          environmentName: updated.name,
          baseUrl: updated.baseUrl,
          lastSeenAt: updated.lastSeenAt?.toISOString() ?? null,
        })

        await this.repo.updateHealth(updated.id, {
          offlineNotifiedAt: new Date(),
        })
      }

      if (options.throwOnFailure) {
        if (error instanceof HttpException && error.getStatus() >= 500) {
          throw error
        }

        throw this.badRequest(
          "environment.testFailed",
          { name: updated.name },
          "ENVIRONMENT_UNREACHABLE",
        )
      }

      return null
    }
  }

  private getRemoteAccess(environment: NonNullable<EnvironmentRow>) {
    if (!environment.baseUrl || !environment.agentTokenEnc) {
      throw this.badRequest(
        "environment.remoteAccessMissing",
        undefined,
        "REMOTE_ENVIRONMENT_ACCESS_MISSING",
      )
    }

    return {
      baseUrl: environment.baseUrl,
      token: this.crypto.decrypt(environment.agentTokenEnc),
    }
  }

  private normalizeRotationState(value?: string | null): EnvironmentRotationState {
    if (value && ENVIRONMENT_ROTATION_STATES.includes(value as EnvironmentRotationState)) {
      return value as EnvironmentRotationState
    }
    return "paired"
  }

  private async fetchAgentSetupStatus(baseUrl: string): Promise<AgentSetupStatusPayload> {
    let response: Response
    try {
      response = await fetch(`${baseUrl}/agent/v1/setup/status`)
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to fetch remote setup status ${baseUrl}: ${error instanceof Error ? error.message : String(error)}`,
      )
      throw this.badGateway(
        "environment.remoteAgentUnavailable",
        undefined,
        "REMOTE_AGENT_UNAVAILABLE",
      )
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      this.logger.warn(
        `Remote setup status returned HTTP ${response.status} for ${baseUrl}: ${body.slice(0, 500)}`,
      )
      throw this.badGateway(
        "environment.remoteAgentHttpError",
        { status: response.status },
        "REMOTE_AGENT_REQUEST_FAILED",
      )
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      return {}
    }

    return (await response.json()) as AgentSetupStatusPayload
  }

  private deriveSetupState(
    currentState: EnvironmentRotationState,
    agentState: EnvironmentRotationState,
    hasPendingBootstrap: boolean,
  ): EnvironmentRotationState {
    if (agentState === "ready_to_complete") return "ready_to_complete"
    if (agentState === "pending_rotation") return "pending_rotation"

    if (agentState === "paired") {
      if (
        hasPendingBootstrap &&
        (currentState === "pending_rotation" || currentState === "ready_to_complete")
      ) {
        return currentState
      }
      return "paired"
    }

    if (agentState === "unpaired") {
      if (!hasPendingBootstrap) return "unpaired"
      return currentState === "pending_rotation" ? "pending_rotation" : "ready_to_pair"
    }

    if (agentState === "ready_to_pair") {
      return hasPendingBootstrap ? "ready_to_pair" : "unpaired"
    }

    return currentState
  }

  private deriveSetupPhase(
    environment: NonNullable<EnvironmentRow>,
    agentState: EnvironmentRotationState,
  ): SetupPhase {
    if (!environment.agentTokenEnc && agentState === "paired") {
      return "blocked"
    }

    if (agentState === "ready_to_complete") {
      return "ready_to_complete"
    }

    return "waiting_for_token"
  }

  private deriveSetupBlockingReason(
    environment: NonNullable<EnvironmentRow>,
    agentState: EnvironmentRotationState,
  ): SetupBlockingReason | null {
    if (!environment.agentTokenEnc && agentState === "paired") {
      return "agent_already_paired"
    }

    return null
  }

  private isWaitingInitialSetup(environment: NonNullable<EnvironmentRow>) {
    if (!environment.pendingBootstrapTokenEnc) return false

    const state = this.normalizeRotationState(environment.rotationState)
    return state === "unpaired" || state === "ready_to_pair" || state === "ready_to_complete"
  }

  private isVisibleEnvironment(environment: NonNullable<EnvironmentRow>) {
    return environment.kind === "local" || Boolean(environment.agentTokenEnc)
  }

  private async emitSetupFailureNotification(
    environment: NonNullable<EnvironmentRow>,
    message: string,
  ) {
    await this.notifications.emitSystemError(
      message,
      {
        environmentId: environment.id,
        environmentName: environment.name,
        baseUrl: environment.baseUrl,
        rotationState: this.normalizeRotationState(environment.rotationState),
      },
      undefined,
      {
        environmentId: environment.id,
        environmentName: environment.name,
      },
    )
  }

  private async requestAgentJson<T>(
    baseUrl: string,
    path: string,
    token: string,
    init?: { method?: "GET" | "POST"; body?: unknown },
  ): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: init?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      })
    } catch (error: unknown) {
      this.logger.warn(
        `Failed remote agent request ${baseUrl}${path}: ${error instanceof Error ? error.message : String(error)}`,
      )
      throw this.badGateway(
        "environment.remoteAgentUnavailable",
        undefined,
        "REMOTE_AGENT_UNAVAILABLE",
      )
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      this.logger.warn(
        `Remote agent request returned HTTP ${response.status} for ${baseUrl}${path}: ${body.slice(0, 500)}`,
      )
      throw this.badGateway(
        "environment.remoteAgentHttpError",
        { status: response.status },
        "REMOTE_AGENT_REQUEST_FAILED",
      )
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      this.logger.warn(`Remote agent returned invalid content-type for ${baseUrl}${path}: ${contentType}`)
      throw this.badGateway(
        "environment.remoteAgentInvalidResponse",
        undefined,
        "REMOTE_AGENT_INVALID_RESPONSE",
      )
    }

    return (await response.json()) as T
  }

  private badRequest(key: string, params?: TranslationParams, code?: string) {
    return new BadRequestException({
      message: t(key, params),
      ...(code ? { code } : {}),
    })
  }

  private badGateway(key: string, params?: TranslationParams, code?: string) {
    return new BadGatewayException({
      message: t(key, params),
      ...(code ? { code } : {}),
    })
  }
}
