import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common"
import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

/**
 * PrismaService (Prisma 7 + SQLite):
 * - Prisma 7, neste modo, exige options válidas no constructor
 * - Para SQLite, usamos Driver Adapter (better-sqlite3)
 *
 * DATABASE_URL exemplo:
 * - dev local: file:./prisma/dev.db
 * - docker:     file:/data/docksentinel.db
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public readonly client: PrismaClient

  constructor() {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL is required")

    // Adapter recomendado para SQLite no Prisma 7
    const adapter = new PrismaBetterSqlite3({ url })

    // Agora o PrismaClient recebe { adapter } (isso é suportado e validado)
    this.client = new PrismaClient({ adapter })
  }

  async onModuleInit() {
    await this.client.$connect()
  }

  async onModuleDestroy() {
    await this.client.$disconnect()
  }
}
