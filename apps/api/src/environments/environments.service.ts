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
  LOCAL_ENVIRONMENT_ID,
  LOCAL_ENVIRONMENT_NAME,
} from "./environment.constants"
import type {
  AgentInfoDto,
  CreateRemoteEnvironmentInput,
  EnvironmentDto,
  UpdateRemoteEnvironmentInput,
} from "./dto/environment.dto"
import { EnvironmentsRepository } from "./environments.repository"

type EnvironmentRow = Awaited<ReturnType<EnvironmentsRepository["findById"]>>
type ProbeOptions = {
  notifyOnOffline: boolean
  throwOnFailure: boolean
}

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
    const localFirst = items.sort((a, b) => {
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

    const agentToken = this.generateAgentToken()
    const environment = await this.repo.createRemote({
      id: randomUUID(),
      name,
      baseUrl,
      agentTokenEnc: this.crypto.encrypt(agentToken),
    })

    await this.schedulerRepo.ensureEnvironmentConfig(environment.id, environment.name)

    return {
      environment: this.toDto(environment),
      agentToken,
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

    const agentToken = this.generateAgentToken()
    const updated = await this.repo.updateRemote(id, {
      agentTokenEnc: this.crypto.encrypt(agentToken),
    })

    return {
      environment: this.toDto(updated),
      agentToken,
    }
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
    if (!environment.baseUrl || !environment.agentTokenEnc) {
      throw new BadRequestException("Remote environment is missing baseUrl or token")
    }
    return this.fetchAgentInfo(environment.baseUrl, this.crypto.decrypt(environment.agentTokenEnc))
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
      throw new BadRequestException(`Invalid baseUrl: ${raw}`)
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new BadRequestException("baseUrl must use http or https")
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
    const res = await fetch(`${baseUrl}/agent/v1/info`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(body || `HTTP ${res.status}`)
    }

    return (await res.json()) as AgentInfoDto
  }

  private generateAgentToken() {
    return `dsa_${randomBytes(24).toString("base64url")}`
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

    if (!environment.baseUrl || !environment.agentTokenEnc) {
      const message = "Remote environment is missing baseUrl or token"
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
      const info = await this.fetchAgentInfo(
        environment.baseUrl,
        this.crypto.decrypt(environment.agentTokenEnc),
      )
      const now = new Date()
      const updated = await this.repo.updateHealth(environment.id, {
        agentVersion: info.agentVersion,
        dockerVersion: info.dockerVersion ?? null,
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
}
