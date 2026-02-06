import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronTime } from 'cron';
import { Env } from '../config/env.schema';
import {
  UpdatesSchedulerRepository,
  type SchedulerPatch,
} from './updates.scheduler.repository';
import {
  UpdatesOrchestratorService,
  type ScanAndEnqueueResult,
} from './updates.orchestrator.service';

const JOB_NAME = 'updates_scan_job';

@Injectable()
export class UpdatesSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(UpdatesSchedulerService.name);

  private applying = false;
  private applyQueued = false;
  private ticking = false;

  // observabilidade simples (memória)
  private nextScanAt: Date | null = null;
  private lastRunAt: Date | null = null;
  private lastFinishedAt: Date | null = null;
  private lastError: string | null = null;
  private lastResult: ScanAndEnqueueResult | null = null;
  private readonly timeZone?: string;

  constructor(
    private readonly repo: UpdatesSchedulerRepository,
    private readonly schedule: SchedulerRegistry,
    private readonly orchestrator: UpdatesOrchestratorService,
    private readonly config: ConfigService<Env>,
  ) {
    this.timeZone = this.normalizeTimeZone(
      this.config.get('TZ', { infer: true }),
    );

    if (this.timeZone) {
      this.logger.log(`Scheduler timezone set to ${this.timeZone} (ENV TZ)`);
    }
  }

  async onModuleInit() {
    // garante singleton
    await this.repo.upsert({});
    await this.applyFromDb();
  }

  async getConfig() {
    return this.repo.get();
  }

  /**
   * ✅ Retorna config + runtime status (para UI)
   */
  async getStatus() {
    const cfg = await this.repo.get();
    const job = this.tryGetJob();
    const nextScanAt = this.getNextDateSafe(job);

    return {
      config: cfg,
      runtime: {
        hasJob: Boolean(job),
        enabled: Boolean(cfg?.enabled),
        ticking: this.ticking,
        nextScanAt,
        lastRunAt: this.lastRunAt,
        lastFinishedAt: this.lastFinishedAt,
        lastError: this.lastError,
        lastResult: this.lastResult,
      },
    };
  }

  async updateConfig(patch: SchedulerPatch) {
    // valida cron se veio
    if (patch.cronExpr !== undefined) {
      this.assertCronValid(patch.cronExpr);
    }

    const saved = await this.repo.upsert(patch);
    await this.applyFromDb();
    return saved;
  }

  async applyFromDb() {
    if (this.applying) {
      this.applyQueued = true;
      return;
    }
    this.applying = true;

    try {
      const cfg = await this.repo.get();
      if (!cfg) return;

      const job = this.getOrCreateJob();

      // sempre para antes de reaplicar
      job.stop();

      if (!cfg.enabled) {
        this.logger.log('Scheduler disabled (db)');
        return;
      }

      // ✅ valida cron de verdade
      const cronTime = new CronTime(cfg.cronExpr, this.timeZone);
      job.setTime(cronTime);
      job.start();

      const next = this.getNextDateSafe(job);
      this.logger.log(
        `Scheduler enabled (db). cron=${cfg.cronExpr} mode=${cfg.mode} scope=${cfg.scope} tz=${this.timeZone ?? 'system'} next=${next ?? '?'}`,
      );
    } catch (err: unknown) {
      // se algo der errado ao aplicar cron, loga (e não derruba app)
      this.logger.error(`applyFromDb failed: ${this.getErrorMessage(err)}`);
      throw err;
    } finally {
      this.applying = false;
      if (this.applyQueued) {
        this.applyQueued = false;
        await this.applyFromDb();
      }
    }
  }

  stop() {
    try {
      const job = this.schedule.getCronJob(JOB_NAME);
      job.stop();
      this.schedule.deleteCronJob(JOB_NAME);
      this.logger.log('Scheduler job removed');
    } catch {
      // ok, não existia
    }
  }

  /**
   * ✅ Job criado UMA vez. Cron real vem do DB via setTime().
   */
  private getOrCreateJob(): CronJob {
    const existing = this.tryGetJob();
    if (existing) return existing;

    // placeholder (vai ser substituído por setTime)
    const job = new CronJob(
      '*/5 * * * *',
      async () => {
        if (this.ticking) return;
        this.ticking = true;

        this.lastRunAt = new Date();
        this.lastFinishedAt = null;
        this.lastError = null;
        this.lastResult = null;

        try {
          this.logger.log('[scheduler] tick start');

          const result = await this.orchestrator.scanAndEnqueueFromDb();
          this.lastResult = result;

          // ✅ loga também quando for scan_only (antes você “não via nada”)
          const scanned = result?.scanned ?? '?';
          const mode = result?.mode ?? '?';
          const queuedCount = Array.isArray(result?.queued?.queued)
            ? result.queued.queued.length
            : 0;

          const skippedCount = Array.isArray(result?.queued?.skipped)
            ? result.queued.skipped.length
            : 0;

          this.logger.log(
            `[scheduler] tick ok mode=${mode} scanned=${scanned} queued=${queuedCount} skipped=${skippedCount}`,
          );

          this.logger.log(
            `[scheduler] tick ok mode=${mode} scanned=${scanned} queued=${queuedCount}`,
          );
        } catch (err: unknown) {
          const msg = this.getErrorMessage(err);
          this.lastError = msg;
          this.logger.error(`[scheduler] tick failed: ${msg}`);
        } finally {
          this.lastFinishedAt = new Date();
          this.nextScanAt = this.safeNextScan(job);
          this.logger.log(
            `[scheduler] tick done finishedAt=${this.lastFinishedAt.toISOString()} next=${this.nextScanAt ? this.nextScanAt.toString() : '?'}`,
          );
          this.ticking = false;
        }
      },
      null,
      false,
      this.timeZone,
    );

    this.schedule.addCronJob(JOB_NAME, job);
    this.logger.log('Scheduler job registered (created once)');
    return job;
  }

  private tryGetJob(): CronJob | null {
    try {
      return this.schedule.getCronJob(JOB_NAME);
    } catch {
      return null;
    }
  }

  private getNextDateSafe(job: CronJob | null): Date | null {
    if (!job) return null;
    try {
      const next = job.nextDate?.();
      return this.toDate(next);
    } catch {
      return null;
    }
  }

  private assertCronValid(expr: string) {
    const s = String(expr ?? '').trim();
    if (!s) throw new BadRequestException('cronExpr is required');

    try {
      // ✅ isso valida mesmo (diferente do split em 5 campos)
      new CronTime(s, this.timeZone);
    } catch (err: unknown) {
      throw new BadRequestException(`Invalid cronExpr: ${s}`);
    }
  }
  private safeNextScan(job: CronJob): Date | null {
    try {
      const next = job.nextDate?.();
      return this.toDate(next);
    } catch {
      return null;
    }
  }

  private logTickSummary(result: ScanAndEnqueueResult) {
    const scanned = result?.scanned ?? 0;
    const mode = result?.mode ?? '?';

    // quando scan_only, queued costuma ser null
    const queuedCount = result?.queued?.queued?.length ?? 0;
    const skippedCount = result?.queued?.skipped?.length ?? 0;

    this.logger.log(
      `[SchedulerTick] mode=${mode} scanned=${scanned} queued=${queuedCount} skipped=${skippedCount}`,
    );
  }

  private toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'object') {
      const maybe = value as { toJSDate?: () => Date };
      if (typeof maybe.toJSDate === 'function') return maybe.toJSDate();
    }
    const asString = String(value);
    const parsed = new Date(asString);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (!err || typeof err !== 'object') return String(err);
    const maybe = err as { message?: unknown };
    return typeof maybe.message === 'string' ? maybe.message : String(err);
  }

  private normalizeTimeZone(raw?: string | null): string | undefined {
    const tz = String(raw ?? '').trim();
    return tz ? tz : undefined;
  }
}
