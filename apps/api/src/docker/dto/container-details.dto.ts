/**
 * DTO “enxuto” com o essencial pra UI e pro future update engine.
 * (A gente NÃO devolve o inspect bruto inteiro porque ele é gigante.)
 */
export type ContainerPortBinding = {
  containerPort: string // ex: "80/tcp"
  hostIp?: string
  hostPort?: string
}

export type ContainerMount = {
  type: string // bind | volume | tmpfs | npipe...
  source?: string // caminho no host ou nome do volume
  target: string // caminho dentro do container
  readOnly: boolean
}

export type ContainerNetwork = {
  name: string
  ipv4Address?: string
  ipv6Address?: string
  macAddress?: string
}

export type ContainerDetailsDto = {
  id: string
  name: string
  image: string
  state: string
  status: string

  env: string[]
  labels: Record<string, string>

  restartPolicy?: { name: string; maximumRetryCount?: number }

  ports: ContainerPortBinding[]
  mounts: ContainerMount[]
  networks: ContainerNetwork[]
}
