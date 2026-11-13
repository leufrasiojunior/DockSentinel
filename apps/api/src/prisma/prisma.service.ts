import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common"
import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { mkdirSync } from "node:fs"
import { dirname, isAbsolute, resolve } from "node:path"

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

    this.ensureSqliteDirectory(url)

    // Adapter recomendado para SQLite no Prisma 7
    const adapter = new PrismaBetterSqlite3({ url })

    // Agora o PrismaClient recebe { adapter } (isso é suportado e validado)
    this.client = new PrismaClient({ adapter })
  }

  async onModuleInit() {
    await this.client.$connect()
    await this.ensureRegistryCredentialTable()
  }

  private async ensureRegistryCredentialTable() {
    try {
      await this.client.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "RegistryCredential" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "serverAddress" TEXT NOT NULL,
          "username" TEXT NOT NULL,
          "passwordEnc" TEXT NOT NULL,
          "enabled" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)
      await this.client.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "RegistryCredential_serverAddress_key" ON "RegistryCredential"("serverAddress");
      `)
    } catch {
      // Ignora em bancos somente-leitura ou mocks
    }
  }

  async onModuleDestroy() {
    await this.client.$disconnect()
  }

  private ensureSqliteDirectory(url: string) {
    if (!url.startsWith("file:")) return

    const rawPath = url.slice("file:".length)
    if (!rawPath || rawPath === ":memory:") return

    const fsPath = isAbsolute(rawPath) ? rawPath : resolve(process.cwd(), rawPath)
    mkdirSync(dirname(fsPath), { recursive: true })
  }
}
