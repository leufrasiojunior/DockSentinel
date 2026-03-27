import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { Interval } from "@nestjs/schedule"
import { SettingsService } from "../settings/settings.service"
import { EnvironmentsRepository } from "./environments.repository"
import { EnvironmentsService } from "./environments.service"

@Injectable()
export class EnvironmentHealthMonitorService implements OnModuleInit {
  private readonly logger = new Logger(EnvironmentHealthMonitorService.name)
  private lastRunAt: Date | null = null
  private running = false

  constructor(
    private readonly repo: EnvironmentsRepository,
    private readonly settings: SettingsService,
    private readonly environments: EnvironmentsService,
  ) {}

  onModuleInit() {
    queueMicrotask(() => {
      void this.runIfDue(true)
    })
  }

  @Interval(60_000)
  async handleTick() {
    await this.runIfDue(false)
  }

  private async runIfDue(force: boolean) {
    if (this.running) return

    const safe = await this.settings.getSafeSettings()
    const intervalMin = this.normalizeInterval(safe.environmentHealthcheckIntervalMin)
    const now = Date.now()

    if (!force && this.lastRunAt && now - this.lastRunAt.getTime() < intervalMin * 60_000) {
      return
    }

    this.running = true
    this.lastRunAt = new Date(now)

    try {
      const environments = await this.repo.listAll()
      const remotes = environments.filter(
        (environment) => environment.kind === "remote" && Boolean(environment.agentTokenEnc),
      )

      for (const environment of remotes) {
        try {
          await this.environments.monitorEnvironment(environment.id)
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          this.logger.warn(`Environment healthcheck failed for ${environment.name}: ${message}`)
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Environment health monitor tick failed: ${message}`)
    } finally {
      this.running = false
    }
  }

  private normalizeInterval(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value)) return 5
    const minutes = Math.floor(value)
    if (minutes < 1) return 1
    if (minutes > 1440) return 1440
    return minutes
  }
}
