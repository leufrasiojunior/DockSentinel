import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common"
import { CryptoService } from "../crypto/crypto.service"
import { encodeAgentRegistryAuthHeader } from "../docker/registry-auth.util"
import { LOCAL_ENVIRONMENT_ID } from "../environments/environment.constants"
import { EnvironmentsRepository } from "../environments/environments.repository"
import type { RecreateDto } from "../docker/dto/recreate.dto"
import type { UpdateDto } from "../docker/dto/update.dto"
import { t } from "../i18n/translate"
import { SettingsService } from "../settings/settings.service"

@Injectable()
export class RemoteRuntimeClientService {
  private readonly logger = new Logger(RemoteRuntimeClientService.name)

  constructor(
    private readonly environmentsRepo: EnvironmentsRepository,
    private readonly crypto: CryptoService,
    @Optional() private readonly settings?: SettingsService,
  ) {}

  private async buildRegistryAuthHeaders(): Promise<Record<string, string>> {
    if (!this.settings) return {}
    const entries = await this.settings.getEnabledRegistryAuthEntries()
    const encoded = encodeAgentRegistryAuthHeader(entries)
    return encoded ? { "X-DockSentinel-Registry-Auth": encoded } : {}
  }

  async listContainers(environmentId: string) {
    return this.request(environmentId, "/agent/v1/containers")
  }

  async listContainersReadonly(environmentId: string) {
    return this.request(environmentId, "/agent/v1/containers", undefined, {
      syncHealth: false,
    })
  }

  async getContainerDetails(environmentId: string, id: string) {
    return this.request(environmentId, `/agent/v1/containers/${encodeURIComponent(id)}`)
  }

  async buildRecreatePlan(environmentId: string, id: string) {
    return this.request(
      environmentId,
      `/agent/v1/containers/${encodeURIComponent(id)}/recreate-plan`,
    )
  }

  async updateCheck(environmentId: string, name: string) {
    const extraHeaders = await this.buildRegistryAuthHeaders()
    return this.request(
      environmentId,
      `/agent/v1/containers/${encodeURIComponent(name)}/update-check`,
      { headers: extraHeaders },
    )
  }

  async recreateContainer(environmentId: string, name: string, body: RecreateDto) {
    const extraHeaders = await this.buildRegistryAuthHeaders()
    return this.request(
      environmentId,
      `/agent/v1/containers/${encodeURIComponent(name)}/recreate`,
      {
        method: "POST",
        body,
        headers: extraHeaders,
      },
    )
  }

  async updateContainer(environmentId: string, name: string, body: UpdateDto) {
    const extraHeaders = await this.buildRegistryAuthHeaders()
    return this.request(
      environmentId,
      `/agent/v1/containers/${encodeURIComponent(name)}/update`,
      {
        method: "POST",
        body,
        headers: extraHeaders,
      },
    )
  }

  private async request(
    environmentId: string,
    path: string,
    init?: { method?: "GET" | "POST"; body?: unknown; headers?: Record<string, string> },
    options?: { syncHealth?: boolean },
  ) {
    const environment = await this.environmentsRepo.findById(environmentId)
    if (!environment) {
      throw new NotFoundException({
        message: t("environment.notFound", { id: environmentId }),
        code: "ENVIRONMENT_NOT_FOUND",
      })
    }
    if (environment.id === LOCAL_ENVIRONMENT_ID || environment.kind !== "remote") {
      throw new BadRequestException({
        message: t("environment.remoteOperationRequiresRemote"),
        code: "REMOTE_ENVIRONMENT_REQUIRED",
      })
    }
    if (!environment.baseUrl || !environment.agentTokenEnc) {
      throw new BadRequestException({
        message: t("environment.remoteAccessMissing"),
        code: "REMOTE_ENVIRONMENT_ACCESS_MISSING",
      })
    }

    const token = this.crypto.decrypt(environment.agentTokenEnc)
    let response: Response
    try {
      response = await fetch(`${environment.baseUrl}${path}`, {
        method: init?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(init?.headers ?? {}),
        },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      })
    } catch (error: unknown) {
      const safeMessage = t("environment.remoteAgentUnavailable")
      if (options?.syncHealth !== false) {
        await this.environmentsRepo.updateHealth(environment.id, {
          lastError: safeMessage,
          connectivityStatus: "offline",
        })
      }
      this.logger.warn(
        `Remote request failed env=${environment.id} path=${path}: ${error instanceof Error ? error.message : String(error)}`,
      )
      throw new BadGatewayException({
        message: safeMessage,
        code: "REMOTE_AGENT_UNAVAILABLE",
      })
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      const safeMessage = t("environment.remoteAgentHttpError", { status: response.status })
      const shouldMarkOffline = response.status === 401 || response.status >= 502
      if (options?.syncHealth !== false && shouldMarkOffline) {
        await this.environmentsRepo.updateHealth(environment.id, {
          lastError: safeMessage,
          connectivityStatus: "offline",
        })
      }
      this.logger.warn(
        `Remote request returned HTTP ${response.status} env=${environment.id} path=${path} body=${errorText.slice(0, 500)}`,
      )
      throw new BadGatewayException({
        message: safeMessage,
        code: "REMOTE_AGENT_REQUEST_FAILED",
      })
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      const safeMessage = t("environment.remoteAgentInvalidResponse")
      if (options?.syncHealth !== false) {
        await this.environmentsRepo.updateHealth(environment.id, {
          lastError: safeMessage,
          connectivityStatus: "offline",
        })
      }
      this.logger.warn(
        `Remote request returned invalid content-type env=${environment.id} path=${path} contentType=${contentType}`,
      )
      throw new BadGatewayException({
        message: safeMessage,
        code: "REMOTE_AGENT_INVALID_RESPONSE",
      })
    }

    try {
      const payload = await response.json()
      if (options?.syncHealth !== false) {
        await this.environmentsRepo.updateHealth(environment.id, {
          lastSeenAt: new Date(),
          lastError: null,
          connectivityStatus: "online",
          offlineNotifiedAt: null,
        })
      }
      return payload
    } catch (error: unknown) {
      const safeMessage = t("environment.remoteAgentInvalidResponse")
      if (options?.syncHealth !== false) {
        await this.environmentsRepo.updateHealth(environment.id, {
          lastError: safeMessage,
          connectivityStatus: "offline",
        })
      }
      this.logger.warn(
        `Remote request returned invalid JSON env=${environment.id} path=${path}: ${error instanceof Error ? error.message : String(error)}`,
      )
      throw new BadGatewayException({
        message: safeMessage,
        code: "REMOTE_AGENT_INVALID_RESPONSE",
      })
    }
  }
}
