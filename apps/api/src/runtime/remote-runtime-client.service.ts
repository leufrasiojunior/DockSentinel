import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { CryptoService } from "../crypto/crypto.service"
import { LOCAL_ENVIRONMENT_ID } from "../environments/environment.constants"
import { EnvironmentsRepository } from "../environments/environments.repository"
import type { RecreateDto } from "../docker/dto/recreate.dto"
import type { UpdateDto } from "../docker/dto/update.dto"

@Injectable()
export class RemoteRuntimeClientService {
  constructor(
    private readonly environmentsRepo: EnvironmentsRepository,
    private readonly crypto: CryptoService,
  ) {}

  async listContainers(environmentId: string) {
    return this.request(environmentId, "/agent/v1/containers")
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
    return this.request(
      environmentId,
      `/agent/v1/containers/${encodeURIComponent(name)}/update-check`,
    )
  }

  async recreateContainer(environmentId: string, name: string, body: RecreateDto) {
    return this.request(
      environmentId,
      `/agent/v1/containers/${encodeURIComponent(name)}/recreate`,
      {
        method: "POST",
        body,
      },
    )
  }

  async updateContainer(environmentId: string, name: string, body: UpdateDto) {
    return this.request(
      environmentId,
      `/agent/v1/containers/${encodeURIComponent(name)}/update`,
      {
        method: "POST",
        body,
      },
    )
  }

  private async request(
    environmentId: string,
    path: string,
    init?: { method?: "GET" | "POST"; body?: unknown },
  ) {
    const environment = await this.environmentsRepo.findById(environmentId)
    if (!environment) {
      throw new NotFoundException(`Environment not found: ${environmentId}`)
    }
    if (environment.id === LOCAL_ENVIRONMENT_ID || environment.kind !== "remote") {
      throw new BadRequestException(`Environment ${environmentId} is not remote`)
    }
    if (!environment.baseUrl || !environment.agentTokenEnc) {
      throw new BadRequestException(`Environment ${environmentId} is missing baseUrl or token`)
    }

    const token = this.crypto.decrypt(environment.agentTokenEnc)
    const response = await fetch(`${environment.baseUrl}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": init?.body === undefined ? "application/json" : "application/json",
      },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      await this.environmentsRepo.updateHealth(environment.id, {
        lastError: errorText || `HTTP ${response.status}`,
        connectivityStatus: "offline",
      })
      throw new BadRequestException(errorText || `Remote request failed: HTTP ${response.status}`)
    }

    await this.environmentsRepo.updateHealth(environment.id, {
      lastSeenAt: new Date(),
      lastError: null,
      connectivityStatus: "online",
      offlineNotifiedAt: null,
    })

    return response.json()
  }
}
