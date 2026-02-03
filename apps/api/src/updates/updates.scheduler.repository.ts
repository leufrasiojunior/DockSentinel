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

  get() {
    return this.prisma.client.updateSchedulerConfig.findUnique({
      where: { id: 1 },
    })
  }

  async upsert(patch: SchedulerPatch) {
    return this.prisma.client.updateSchedulerConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        ...patch,
      },
      update: {
        ...patch,
      },
    })
  }
}
