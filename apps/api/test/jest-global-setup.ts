import Database from "better-sqlite3"
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"

export default async function globalSetup() {
  // 1) Aponta E2E para um DB isolado
  const e2eDbPath = resolve(process.cwd(), "prisma", "e2e.db")
  process.env.DATABASE_URL = `file:${e2eDbPath}`

  // 2) Garante pasta prisma/ existe
  mkdirSync(resolve(process.cwd(), "prisma"), { recursive: true })

  // 3) Zera o DB pra ficar determinístico
  rmSync(e2eDbPath, { force: true })

  // 4) Aplica as migrations SQL diretamente no SQLite de E2E
  const db = new Database(e2eDbPath)
  const migrationsDir = resolve(process.cwd(), "prisma", "migrations")
  const migrationDirs = readdirSync(migrationsDir)
    .filter((entry) => entry !== "migration_lock.toml")
    .sort()

  try {
    db.pragma("foreign_keys = ON")

    for (const migrationDir of migrationDirs) {
      const sqlPath = join(migrationsDir, migrationDir, "migration.sql")
      const sql = readFileSync(sqlPath, "utf8")
      db.exec(sql)
    }
  } finally {
    db.close()
  }
}
