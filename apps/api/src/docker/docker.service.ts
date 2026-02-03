import { Injectable } from "@nestjs/common"
import Docker from "dockerode"
import type { ContainerDetailsDto } from "./dto/container-details.dto"
import { RecreatePlanDto } from "./dto/recreate-plan.dto"

export type ContainerSummary = {
  id: string
  name: string
  image: string
  state: string
  status: string
  labels: Record<string, string>
}


@Injectable()
export class DockerService {
  private readonly docker = new Docker({ socketPath: "/var/run/docker.sock" })

async listContainers(): Promise<ContainerSummary[]> {
  const items = await this.docker.listContainers({ all: true })
  return items.map((c) => ({
    id: c.Id,
    name: c.Names?.[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12),
    image: c.Image,
    state: c.State,
    status: c.Status,
    labels: c.Labels ?? {},
  }))
}


  /**
   * Faz "docker inspect" do container e extrai os campos que vamos precisar
   * no update engine (recriar preservando config).
   */
  async getContainerDetails(id: string): Promise<ContainerDetailsDto> {
    const container = this.docker.getContainer(id)
    const info = await container.inspect()

    const name = (info.Name ?? "").replace(/^\//, "") || id.slice(0, 12)

    // Env vem como ["KEY=VALUE", ...]
    const env = info.Config?.Env ?? []

    const labels = info.Config?.Labels ?? {}

    // Restart policy
    const restartPolicy = info.HostConfig?.RestartPolicy
      ? {
          name: info.HostConfig.RestartPolicy.Name,
          maximumRetryCount: info.HostConfig.RestartPolicy.MaximumRetryCount,
        }
      : undefined

    /**
     * Ports:
     * info.NetworkSettings.Ports é um map:
     * {
     *   "80/tcp": [{ HostIp: "0.0.0.0", HostPort: "8080" }],
     *   "443/tcp": null
     * }
     */
    const ports: ContainerDetailsDto["ports"] = []
    const portsMap = info.NetworkSettings?.Ports ?? {}
    for (const containerPort of Object.keys(portsMap)) {
      const bindings = portsMap[containerPort]
      if (!bindings) {
        ports.push({ containerPort })
        continue
      }
      for (const b of bindings) {
        ports.push({
          containerPort,
          hostIp: b.HostIp,
          hostPort: b.HostPort,
        })
      }
    }

    /**
     * Mounts (volumes/binds):
     * info.Mounts[] tem Source, Destination, RW, Type...
     */
    const mounts =
      info.Mounts?.map((m) => ({
        type: m.Type,
        source: m.Source,
        target: m.Destination,
        readOnly: !m.RW,
      })) ?? []

    /**
     * Networks:
     * info.NetworkSettings.Networks é um map por nome de rede.
     */
    const networks: ContainerDetailsDto["networks"] = []
    const networksMap = info.NetworkSettings?.Networks ?? {}
    for (const netName of Object.keys(networksMap)) {
      const n = networksMap[netName]
      networks.push({
        name: netName,
        ipv4Address: n.IPAddress,
        ipv6Address: n.GlobalIPv6Address,
        macAddress: n.MacAddress,
      })
    }

    return {
      id: info.Id,
      name,
      image: info.Config?.Image ?? "",
      state: info.State?.Status ?? "unknown",
      status: info.State?.Status ?? "unknown",

      env,
      labels,
      restartPolicy,
      ports,
      mounts,
      networks,
    }
  }

async buildRecreatePlan(id: string): Promise<RecreatePlanDto> {
    const container = this.docker.getContainer(id)
    const info = await container.inspect()

    const name = (info.Name ?? "").replace(/^\//, "") || id.slice(0, 12)

    const env = info.Config?.Env ?? []
    const labels = info.Config?.Labels ?? {}

    // ExposedPorts é map "80/tcp": {}
    const exposedPorts = info.Config?.ExposedPorts ?? {}

    // PortBindings vem do HostConfig.PortBindings (mais confiável que NetworkSettings.Ports)
    const portBindings = info.HostConfig?.PortBindings ?? {}

    // Binds vem do HostConfig.Binds (já no formato certo)
    const binds = info.HostConfig?.Binds ?? []

    const restartPolicy = info.HostConfig?.RestartPolicy
      ? {
          Name: info.HostConfig.RestartPolicy.Name,
          MaximumRetryCount: info.HostConfig.RestartPolicy.MaximumRetryCount,
        }
      : undefined

    // Networks: vamos mapear nomes e IPs (IP fixo é caso avançado, mas preservamos)
    const networks: RecreatePlanDto["networks"] = []
    const networksMap = info.NetworkSettings?.Networks ?? {}
    for (const netName of Object.keys(networksMap)) {
      const n = networksMap[netName]
      networks.push({
        name: netName,
        ipv4Address: n.IPAddress,
        ipv6Address: n.GlobalIPv6Address,
      })
    }

    return {
      oldId: info.Id,
      name,
      image: info.Config?.Image ?? "",
      env,
      labels,
      exposedPorts,
      portBindings,
      binds,
      restartPolicy,
      networks,
    }
  }

}
