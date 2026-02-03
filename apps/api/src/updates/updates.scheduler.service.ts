import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { SchedulerRegistry } from "@nestjs/schedule"
import { CronJob } from "cron"
import { UpdatesSchedulerRepository } from "./updates.scheduler.repository"
import { UpdatesOrchestratorService } from "./updates.orchestrator.service"


const JOB_NAME = "updates_scan_job"

@Injectable()
export class UpdatesSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(UpdatesSchedulerService.name)

  constructor(
    private readonly repo: UpdatesSchedulerRepository,
    private readonly schedule: SchedulerRegistry,
    private readonly orchestrator: UpdatesOrchestratorService,
  ) {}

  async onModuleInit() {
    // garante que existe a row singleton
    await this.repo.upsert({})
    await this.applyFromDb()
  }

  async getConfig() {
    return this.repo.get()
  }

  async updateConfig(patch: any) {
    // validações extras aqui (cron, coerência, etc)
    if (patch.cronExpr) this.assertCronValid(patch.cronExpr)

    const saved = await this.repo.upsert(patch)
    await this.applyFromDb()
    return saved
  }

  async applyFromDb() {
    const cfg = await this.repo.get()
    if (!cfg) return

    // remove job antigo se existir
    this.stop()

    if (!cfg.enabled) {
      this.logger.log("Scheduler disabled (db)")
      return
    }

    this.logger.log(`Scheduler enabled (db). cron=${cfg.cronExpr} mode=${cfg.mode} scope=${cfg.scope}`)

    const job = new CronJob(cfg.cronExpr, async () => {
      try {
        // scan-and-enqueue usa a config do DB
        await this.orchestrator.scanAndEnqueueFromDb()
      } catch (err: any) {
        this.logger.error(`Scheduled scan failed: ${err?.message ?? err}`)
      }
    })

    this.schedule.addCronJob(JOB_NAME, job)
    job.start()
  }

  stop() {
    try {
      const job = this.schedule.getCronJob(JOB_NAME)
      job.stop()
      this.schedule.deleteCronJob(JOB_NAME)
      this.logger.log("Scheduler job removed")
    } catch {
      // não existia, ok
    }
  }

  private assertCronValid(expr: string) {
    // Validação mínima sem depender de libs extras:
    // - 5 campos
    // - não vazio
    const parts = expr.trim().split(/\s+/)
    if (parts.length !== 5) {
      throw new Error(`Invalid cronExpr: expected 5 fields, got ${parts.length}`)
    }
  }
}
