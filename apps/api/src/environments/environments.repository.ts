import { Injectable } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { LOCAL_ENVIRONMENT_ID, LOCAL_ENVIRONMENT_NAME } from "./environment.constants"

@Injectable()
export class EnvironmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ensureLocalEnvironment() {
    return this.prisma.client.environment.upsert({
      where: { id: LOCAL_ENVIRONMENT_ID },
      create: {
        id: LOCAL_ENVIRONMENT_ID,
        kind: "local",
        name: LOCAL_ENVIRONMENT_NAME,
      },
      update: {
        kind: "local",
        name: LOCAL_ENVIRONMENT_NAME,
      },
    })
  }

  listAll() {
    return this.prisma.client.environment.findMany({
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
    })
  }

  findById(id: string) {
    return this.prisma.client.environment.findUnique({
      where: { id },
    })
  }

  findByName(name: string) {
    return this.prisma.client.environment.findFirst({
      where: { name },
    })
  }

  findRemoteByBaseUrl(baseUrl: string) {
    return this.prisma.client.environment.findFirst({
      where: {
        kind: "remote",
        baseUrl,
      },
    })
  }

  countRemote() {
    return this.prisma.client.environment.count({
      where: { kind: "remote" },
    })
  }

  createRemote(input: {
    id: string
    name: string
    baseUrl: string
    agentTokenEnc?: string | null
    pendingBootstrapTokenEnc?: string | null
    rotationState?: string
  }) {
    return this.prisma.client.environment.create({
      data: {
        id: input.id,
        kind: "remote",
        name: input.name,
        baseUrl: input.baseUrl,
        agentTokenEnc: input.agentTokenEnc ?? null,
        pendingBootstrapTokenEnc: input.pendingBootstrapTokenEnc ?? null,
        rotationState: input.rotationState,
      },
    })
  }

  updateRemote(
    id: string,
    patch: {
      name?: string
      baseUrl?: string
      agentTokenEnc?: string
      pendingBootstrapTokenEnc?: string | null
      rotationState?: string
      agentVersion?: string | null
      dockerVersion?: string | null
      lastSeenAt?: Date | null
      lastError?: string | null
      connectivityStatus?: string
      offlineNotifiedAt?: Date | null
    },
  ) {
    return this.prisma.client.environment.update({
      where: { id },
      data: patch,
    })
  }

  deleteRemote(id: string) {
    return this.prisma.client.environment.delete({
      where: { id },
    })
  }

  updateHealth(
    id: string,
    input: {
      agentVersion?: string | null
      dockerVersion?: string | null
      rotationState?: string
      lastSeenAt?: Date | null
      lastError?: string | null
      connectivityStatus?: string
      offlineNotifiedAt?: Date | null
    },
  ) {
    return this.prisma.client.environment.update({
      where: { id },
      data: input,
    })
  }
}
