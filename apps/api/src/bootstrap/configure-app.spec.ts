import { Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { execFileSync } from "node:child_process"
import { mkdirSync } from "node:fs"
import { ensureMigrations } from "./configure-app"
import type { Env } from "../config/env.schema"

jest.mock("node:child_process", () => ({
  execFileSync: jest.fn(),
}))

jest.mock("node:fs", () => {
  const actual = jest.requireActual("node:fs")
  return {
    ...actual,
    mkdirSync: jest.fn(),
  }
})

describe("ensureMigrations", () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it("runs Prisma migrations when AUTO_MIGRATE=true", () => {
    const config = {
      get: jest.fn((key: keyof Env) => (key === "AUTO_MIGRATE" ? true : undefined)),
    } as unknown as ConfigService<Env>

    ensureMigrations(config, new Logger("test"))

    expect(mkdirSync).toHaveBeenCalled()
    expect(execFileSync).toHaveBeenCalledWith(
      expect.stringContaining("node_modules/.bin/prisma"),
      ["migrate", "deploy", "--config=prisma.config.ts"],
      expect.objectContaining({
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
      }),
    )
  })

  it("skips Prisma migrations when AUTO_MIGRATE=false", () => {
    const config = {
      get: jest.fn((key: keyof Env) => (key === "AUTO_MIGRATE" ? false : undefined)),
    } as unknown as ConfigService<Env>

    ensureMigrations(config, new Logger("test"))

    expect(execFileSync).not.toHaveBeenCalled()
  })
})
