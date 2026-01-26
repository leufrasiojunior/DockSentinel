import { Injectable } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"

/**
 * Patch "plano": somente campos do modelo GlobalSettings.
 * (Nada de { update: {...}, create: {...} } aqui.)
 */
export type SettingsPatch = {
  authMode?: string
  adminPasswordHash?: string | null
  totpSecretEnc?: string | null
  logLevel?: string
  setupCompletedAt?: Date | null
}

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    return this.prisma.client.globalSettings.findUnique({
      where: { id: 1 },
    })
  }

  /**
   * Upsert: se não existir cria; se existir atualiza.
   * Prisma exige `create` e `update` no formato plano.
   */
  async upsert(patch: SettingsPatch) {
    return this.prisma.client.globalSettings.upsert({
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
