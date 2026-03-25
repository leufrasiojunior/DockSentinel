import { Injectable } from "@nestjs/common"
import { PrismaService } from "src/prisma/prisma.service"

export type SchedulerPatch = {
  enabled?: boolean
  cronExpr?: string
  mode?: "scan_only" | "scan_and_update"
  scope?: "all" | "labeled"
  scanLabelKey?: string
  updateLabelKey?: string
}

@Injectable()
export class UpdatesSchedulerRepository {
  constructor(private readonly prisma: PrismaService) {}

  get(environmentId: string) {
    return this.prisma.client.updateSchedulerConfig.findUnique({
      where: { environmentId },
    })
  }

  listAll() {
    return this.prisma.client.updateSchedulerConfig.findMany({
      orderBy: { createdAt: "asc" },
    })
  }

  async ensureEnvironmentConfig(environmentId: string, environmentName: string) {
    return this.prisma.client.updateSchedulerConfig.upsert({
      where: { environmentId },
      create: {
        environmentId,
        environmentName,
      },
      update: {
        environmentName,
      },
    })
  }

  async upsert(environmentId: string, environmentName: string, patch: SchedulerPatch) {
    return this.prisma.client.updateSchedulerConfig.upsert({
      where: { environmentId },
      create: {
        environmentId,
        environmentName,
        ...patch,
      },
      update: {
        environmentName,
        ...patch,
      },
    })
  }

  async renameEnvironment(environmentId: string, environmentName: string) {
    return this.prisma.client.updateSchedulerConfig.updateMany({
      where: { environmentId },
      data: { environmentName },
    })
  }

  async deleteEnvironmentConfig(environmentId: string) {
    await this.prisma.client.updateSchedulerConfig.deleteMany({
      where: { environmentId },
    })
  }
}
