import { Injectable } from "@nestjs/common"
import type {
  EnvironmentDto,
  EnvironmentOverviewConnectionDto,
  EnvironmentOverviewContainersDto,
  EnvironmentOverviewItemDto,
  EnvironmentOverviewListDto,
} from "../environments/dto/environment.dto"
import { EnvironmentsService } from "../environments/environments.service"
import { RuntimeService } from "../runtime/runtime.service"

type RuntimeContainerSummary = {
  state?: string
  status?: string
}

@Injectable()
export class EnvironmentOverviewService {
  constructor(
    private readonly environments: EnvironmentsService,
    private readonly runtime: RuntimeService,
  ) {}

  async listOverview(): Promise<EnvironmentOverviewListDto> {
    const environments = await this.environments.listEnvironments()
    const items = await Promise.all(environments.items.map((environment) => this.buildItem(environment)))

    return { items }
  }

  private async buildItem(environment: EnvironmentDto): Promise<EnvironmentOverviewItemDto> {
    const connection = this.buildConnection(environment)

    if (environment.kind === "remote" && environment.status !== "online") {
      return {
        environment,
        connection,
        containers: this.unavailableContainers(),
      }
    }

    try {
      const containers = (await this.runtime.listContainersReadonly(environment.id)) as RuntimeContainerSummary[]
      return {
        environment,
        connection,
        containers: this.summarizeContainers(containers),
      }
    } catch {
      return {
        environment: {
          ...environment,
          status: "offline",
        },
        connection,
        containers: this.unavailableContainers(),
      }
    }
  }

  private buildConnection(environment: EnvironmentDto): EnvironmentOverviewConnectionDto {
    if (environment.kind === "local") {
      return {
        mode: "local",
        label: "Local host",
      }
    }

    return {
      mode: "remote",
      label: this.getRemoteLabel(environment.baseUrl),
    }
  }

  private getRemoteLabel(baseUrl?: string | null) {
    if (!baseUrl) return "Unknown remote"

    try {
      return new URL(baseUrl).host || baseUrl
    } catch {
      return baseUrl
    }
  }

  private summarizeContainers(
    containers: RuntimeContainerSummary[],
  ): EnvironmentOverviewContainersDto {
    const total = containers.length
    const running = containers.filter((container) => this.isRunning(container)).length
    const healthy = containers.filter((container) => this.isHealthy(container)).length

    return {
      available: true,
      total,
      running,
      stopped: total - running,
      healthy,
    }
  }

  private unavailableContainers(): EnvironmentOverviewContainersDto {
    return {
      available: false,
      total: null,
      running: null,
      stopped: null,
      healthy: null,
    }
  }

  private isRunning(container: RuntimeContainerSummary) {
    return String(container.state ?? "")
      .toLowerCase()
      .includes("run")
  }

  private isHealthy(container: RuntimeContainerSummary) {
    if (!this.isRunning(container)) return false

    const status = String(container.status ?? "").toLowerCase()
    if (!status) return true
    if (status.includes("unhealthy")) return false
    if (status.includes("health: starting")) return false
    if (status.includes("healthy")) return true
    return !status.includes("health:")
  }
}
