// apps/api/test/jest-global-setup.ts
import { execSync } from "node:child_process"
import { rmSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"

export default async function globalSetup() {
  // 1) Aponta E2E para um DB isolado
  const e2eDbPath = resolve(process.cwd(), "prisma", "e2e.db")
  process.env.DATABASE_URL = `file:${e2eDbPath}`

  // 2) Garante pasta prisma/ existe
  mkdirSync(resolve(process.cwd(), "prisma"), { recursive: true })

  // 3) Zera o DB pra ficar determinístico
  rmSync(e2eDbPath, { force: true })

  // 4) Aplica migrations no DB de E2E
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  })
}
