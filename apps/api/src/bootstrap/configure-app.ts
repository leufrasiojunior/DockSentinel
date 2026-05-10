import { Logger, type INestApplication, type LogLevel } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import cookieParser from "cookie-parser"
import { execFileSync } from "node:child_process"
import { mkdirSync } from "node:fs"
import { join, resolve } from "node:path"
import { ApiExceptionFilter } from "../common/filters/api-exception.filter"
import { Env } from "../config/env.schema"
import { resolveLocaleFromAcceptLanguage, runWithLocale } from "../i18n/locale"
import { SettingsService } from "../settings/settings.service"

export function ensureMigrations(config: ConfigService<Env>, logger: Logger) {
  const auto = config.get("AUTO_MIGRATE", { infer: true })
  if (!auto) {
    logger.log("AUTO_MIGRATE=false (skipping migrations)")
    return
  }

  mkdirSync(join(process.cwd(), "data"), { recursive: true })

  logger.log("AUTO_MIGRATE=true -> running Prisma migrations (deploy)...")

  const prismaBin = resolve(process.cwd(), "..", "..", "node_modules", ".bin", "prisma")
  execFileSync(prismaBin, ["migrate", "deploy", "--config=prisma.config.ts"], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  })

  logger.log("Migrations applied (or already up-to-date).")
}

export async function configureApplication(app: INestApplication) {
  const config = app.get<ConfigService<Env>>(ConfigService)
  const secret = config.getOrThrow("DOCKSENTINEL_SECRET", { infer: true })
  const settings = app.get(SettingsService)

  const corsOriginsRaw = config.getOrThrow("CORS_ORIGINS", { infer: true })
  const corsOrigins = corsOriginsRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  const corsAllowAll = corsOrigins.includes("*")

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (corsAllowAll) return cb(null, true)
      if (corsOrigins.includes(origin)) return cb(null, true)
      return cb(new Error(`CORS blocked for origin: ${origin}`), false)
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept-Language"],
  })

  app.useGlobalFilters(new ApiExceptionFilter())
  app.use(cookieParser(secret))

  await settings.initializeDefaultLocaleCache()

  app.use((req, _res, next) => {
    const locale = resolveLocaleFromAcceptLanguage(
      req.headers["accept-language"],
      settings.getCachedDefaultLocale(),
    )

    runWithLocale(locale, () => next())
  })

  return { config, settings }
}

export function resolveNestLogLevels(level: Env["LOG_LEVEL"]): LogLevel[] {
  return level === "error"
    ? ["error"]
    : level === "warn"
      ? ["error", "warn"]
      : level === "debug"
        ? ["error", "warn", "log", "debug", "verbose"]
        : ["error", "warn", "log"]
}
