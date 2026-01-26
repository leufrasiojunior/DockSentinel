/**
 * RecreatePlan:
 * Representa exatamente o que precisamos para recriar um container:
 * - imagem nova
 * - env
 * - labels
 * - portas
 * - volumes/binds
 * - networks
 * - restart policy
 *
 * Esse objeto vira o input do método recreateContainer().
 */

export type PortBindings = Record<string, Array<{ HostIp?: string; HostPort?: string }>>

export type RestartPolicy = {
  Name: string
  MaximumRetryCount?: number
}

export type MountBind = {
  source: string
  target: string
  readOnly: boolean
}

export type NetworkAttachment = {
  name: string
  ipv4Address?: string
  ipv6Address?: string
}

export type RecreatePlanDto = {
  oldId: string
  name: string

  // imagem alvo (ex: nginx:latest)
  image: string

  env: string[]
  labels: Record<string, string>

  // Docker create API usa isso:
  exposedPorts: Record<string, {}> // { "80/tcp": {} }
  portBindings: PortBindings

  binds: string[] // formato Docker: ["hostPath:/containerPath:ro", ...]
  restartPolicy?: RestartPolicy

  networks: NetworkAttachment[]
}
