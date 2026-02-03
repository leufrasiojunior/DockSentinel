import { BadRequestException, Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { SchedulerRegistry } from "@nestjs/schedule"
import { CronJob, CronTime } from "cron"
import { UpdatesSchedulerRepository } from "./updates.scheduler.repository"
import { UpdatesOrchestratorService } from "./updates.orchestrator.service"

const JOB_NAME = "updates_scan_job"

@Injectable()
export class UpdatesSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(UpdatesSchedulerService.name)

  // evita concorrência (updateConfig chamando apply enquanto outro apply roda)
  private applying = false

  // evita sobreposição (scan longo + cron batendo de novo)
  private ticking = false

  constructor(
    private readonly repo: UpdatesSchedulerRepository,
    private readonly schedule: SchedulerRegistry,
    private readonly orchestrator: UpdatesOrchestratorService,
  ) {}

  async onModuleInit() {
    await this.repo.upsert({})
    await this.applyFromDb()
  }

  async getConfig() {
    return this.repo.get()
  }

  async updateConfig(patch: any) {
    if (patch.cronExpr) this.assertCronValid(patch.cronExpr)
    const saved = await this.repo.upsert(patch)
    await this.applyFromDb()
    return saved
  }

  async applyFromDb() {
    if (this.applying) return
    this.applying = true

    try {
      const cfg = await this.repo.get()
      if (!cfg) return

      const job = this.getOrCreateJob()

      // sempre para antes de reaplicar
      job.stop()

      if (!cfg.enabled) {
        this.logger.log("Scheduler disabled (db)")
        return
      }

      // valida de verdade (mais forte que split em 5 campos)
      const cronTime = new CronTime(cfg.cronExpr)

      // troca o cron sem recriar job (ponto principal!)
      job.setTime(cronTime)

      job.start()

      let next: any
      try {
        next = job.nextDate()?.toJSDate?.() ?? job.nextDate()
      } catch {}
      this.logger.log(
        `Scheduler enabled (db). cron=${cfg.cronExpr} mode=${cfg.mode} scope=${cfg.scope} next=${next ?? "?"}`,
      )
    } finally {
      this.applying = false
    }
  }

  stop() {
    const job = this.tryGetJob()
    if (!job) return
    job.stop()
    this.logger.log("Scheduler job stopped")
  }

  // -------------------------
  // Helpers
  // -------------------------

  private tryGetJob(): CronJob | null {
    try {
      return this.schedule.getCronJob(JOB_NAME)
    } catch {
      return null
    }
  }

  private getOrCreateJob(): CronJob {
    const existing = this.tryGetJob()
    if (existing) return existing

    // cria uma vez com qualquer cron “placeholder” (vai ser substituído por setTime)
    const job = new CronJob("*/5 * * * *", async () => {
      if (this.ticking) return
      this.ticking = true

      try {
        await this.orchestrator.scanAndEnqueueFromDb()
      } catch (err: any) {
        this.logger.error(`Scheduled scan failed: ${err?.message ?? err}`)
      } finally {
        this.ticking = false
      }
    })

    this.schedule.addCronJob(JOB_NAME, job)
    this.logger.log("Scheduler job registered (created once)")
    return job
  }

private assertCronValid(expr: string) {
  try {
    // Se for inválida, o cron lib tende a lançar aqui
    // onTick vazio só pra validar
    const job = new CronJob(expr, () => {})
    job.stop()
  } catch (e: any) {
    throw new BadRequestException(`Invalid cronExpr: ${expr}. ${e?.message ?? e}`)
  }
}
}
