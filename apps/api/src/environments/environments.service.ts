import {
  BadRequestException,
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
        throw new BadRequestException(`Remote environment limit reached (${limit})`)
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
      throw new BadRequestException("Only remote environments can be updated")
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
      throw new BadRequestException("Only remote environments can rotate token")
    }

    let nextState: EnvironmentRotationState = "ready_to_pair"
    if (current.agentTokenEnc && this.normalizeRotationState(current.rotationState) === "paired") {
      const { baseUrl, token: currentCredential } = this.getRemoteAccess(current)

      try {
        await this.requestAgentJson(baseUrl, "/agent/v1/setup/prepare-rotation", currentCredential, {
          method: "POST",
        })
      } catch (error: unknown) {
        throw new BadRequestException(
          `Failed to put agent into rotation mode: ${this.getErrorMessage(error)}`,
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
      throw new BadRequestException("Only remote environments have setup status")
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
        lastError: "Remote environment is missing baseUrl",
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
        nextLastError =
          `This agent is already paired with another DockSentinel environment. ` +
          `Rotate the token in the original environment or clear the agent local state to pair it here.`
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
      throw new BadRequestException("Only remote environments can complete setup")
    }

    if (!current.pendingBootstrapTokenEnc) {
      if (current.agentTokenEnc && this.normalizeRotationState(current.rotationState) === "paired") {
        return {
          environment: this.toDto(current),
        }
      }

      throw new BadRequestException("This environment does not have a pending setup token")
    }

    const status = await this.getRemoteSetupStatus(id)
    if (!status.readyToComplete) {
      throw new BadRequestException("The agent setup is not ready to complete yet")
    }

    const currentAgain = await this.getEnvironmentOrThrow(id)
    if (currentAgain.kind !== "remote" || !currentAgain.baseUrl || !currentAgain.pendingBootstrapTokenEnc) {
      throw new BadRequestException("This environment does not have a pending setup token")
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
      const message = `Failed to complete agent setup: ${this.getErrorMessage(error)}`
      await this.emitSetupFailureNotification(currentAgain, message)
      throw new BadRequestException(message)
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
      throw new BadRequestException("Only remote environments can report setup timeout")
    }

    const flow = input.flow === "rotation" ? "rotation" : "install"
    const suffix = input.lastError?.trim() ? ` Last error: ${input.lastError.trim()}` : ""
    const message =
      flow === "rotation"
        ? `Agent rotation timed out after 2 minutes for environment "${current.name}".${suffix}`
        : `Agent setup timed out after 2 minutes for environment "${current.name}".${suffix}`

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
      throw new BadRequestException(`Failed to reach environment "${id}"`)
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
      throw new BadRequestException("Local environment cannot be deleted")
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
      throw new BadRequestException("baseUrl is required")
    }
    if (!/^[a-z]+:\/\//i.test(value)) {
      value = `http://${value}`
    }

    let url: URL
    try {
      url = new URL(value)
    } catch {
      throw new BadRequestException(this.buildInvalidBaseUrlMessage(raw, value))
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new BadRequestException(
        `Invalid baseUrl "${raw}": only http:// or https:// are supported. ${this.baseUrlExamples()}`,
      )
    }

    const hostError = this.validateHostname(url.hostname)
    if (hostError) {
      throw new BadRequestException(
        `Invalid baseUrl "${raw}": ${hostError}. ${this.baseUrlExamples()}`,
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
      return `Invalid baseUrl "${raw}": ${inferred}. ${this.baseUrlExamples()}`
    }

    return `Invalid baseUrl "${raw}": use a valid host or URL. ${this.baseUrlExamples()}`
  }

  private inferHostError(value: string) {
    const withoutProtocol = value.replace(/^[a-z]+:\/\//i, "")
    const hostPort = withoutProtocol.split("/")[0] ?? ""
    if (!hostPort) {
      return "host is missing"
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
      return "host is missing"
    }

    if (!/^\d+(?:\.\d+)+$/.test(host)) {
      return null
    }

    const octets = host.split(".")
    if (octets.length !== 4) {
      return `IPv4 addresses must have exactly 4 blocks, but "${host}" has ${octets.length}`
    }

    for (const octet of octets) {
      const value = Number(octet)
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        return `IPv4 block "${octet}" is out of range (0-255)`
      }
    }

    return null
  }

  private baseUrlExamples() {
    return "Examples: 192.168.3.148, http://192.168.3.148:45873, https://docker.example.com:45873"
  }

  private buildInstallCommand() {
    return [
      "docker run -d",
      "--name docksentinel-agent",
      "--restart unless-stopped",
      `-p ${AGENT_DEFAULT_PORT}:${AGENT_DEFAULT_PORT}`,
      `-e PORT=${AGENT_DEFAULT_PORT}`,
      "-v /var/run/docker.sock:/var/run/docker.sock",
      "-v /opt/docksentinel-agent:/var/lib/docksentinel-agent",
<<<<<<< HEAD
      "leufrasiojunior/docksentinelagent:latest",
=======
      "leufrasiojunior/docksentinel-agent:latest",
>>>>>>> 9a13910a4401cd3ce70dabcacb503c471cec9383
    ].join(" ")
  }

  private buildSetupUrl(baseUrl?: string | null) {
    if (!baseUrl) return null
    return `${baseUrl}/setup`
  }

  private async assertUniqueRemoteName(name: string, exceptId?: string) {
    const existing = await this.repo.findByName(name)
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException(`Environment name already exists: ${name}`)
    }
  }

  private async assertUniqueRemoteBaseUrl(baseUrl: string, exceptId?: string) {
    const existing = await this.repo.findRemoteByBaseUrl(baseUrl)
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException(`Environment URL already exists: ${baseUrl}`)
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
      const message = "Remote environment is missing baseUrl"
      await this.repo.updateHealth(environment.id, {
        lastError: message,
        connectivityStatus: "offline",
      })

      if (options.throwOnFailure) {
        throw new BadRequestException(message)
      }

      return null
    }

    if (!environment.agentTokenEnc) {
      if (this.isWaitingInitialSetup(environment)) {
        return null
      }

      const message = "Remote environment is missing an active credential"
      await this.repo.updateHealth(environment.id, {
        lastError: message,
        connectivityStatus: "offline",
      })

      if (options.throwOnFailure) {
        throw new BadRequestException(message)
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
        throw new BadRequestException(`Failed to reach environment "${updated.name}": ${message}`)
      }

      return null
    }
  }

  private getRemoteAccess(environment: NonNullable<EnvironmentRow>) {
    if (!environment.baseUrl || !environment.agentTokenEnc) {
      throw new BadRequestException("Remote environment is missing baseUrl or active credential")
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
    const response = await fetch(`${baseUrl}/agent/v1/setup/status`)

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      throw new Error(body || `HTTP ${response.status}`)
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
    const response = await fetch(`${baseUrl}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      throw new Error(body || `HTTP ${response.status}`)
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      return undefined as T
    }

    return (await response.json()) as T
  }
}
