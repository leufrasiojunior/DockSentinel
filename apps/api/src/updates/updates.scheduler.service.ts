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
import { NotificationsService } from '../notifications/notifications.service';
import { t } from '../i18n/translate';
import { EnvironmentsService } from '../environments/environments.service';
import {
  LOCAL_ENVIRONMENT_ID,
  LOCAL_ENVIRONMENT_NAME,
} from '../environments/environment.constants';

const JOB_NAME = 'updates_scan_job';

type SchedulerRuntimeState = {
  applying: boolean;
  applyQueued: boolean;
  ticking: boolean;
  nextScanAt: Date | null;
  lastRunAt: Date | null;
  lastFinishedAt: Date | null;
  lastError: string | null;
  lastResult: ScanAndEnqueueResult | null;
};

@Injectable()
export class UpdatesSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(UpdatesSchedulerService.name);
  private readonly runtimeByEnvironment = new Map<string, SchedulerRuntimeState>();
  private readonly configuredTimeZone?: string;
  private readonly timeZone: string;

  constructor(
    private readonly repo: UpdatesSchedulerRepository,
    private readonly schedule: SchedulerRegistry,
    private readonly orchestrator: UpdatesOrchestratorService,
    private readonly config: ConfigService<Env>,
    private readonly notifications: NotificationsService,
    private readonly environments: EnvironmentsService,
  ) {
    this.configuredTimeZone = this.normalizeTimeZone(
      this.config.get('TZ', { infer: true }),
    );
    this.timeZone = this.resolveTimeZone(this.configuredTimeZone);

    if (this.configuredTimeZone) {
      this.logger.log(`Scheduler timezone set to ${this.timeZone} (ENV TZ)`);
    } else {
      this.logger.log(
        `Scheduler timezone resolved to ${this.timeZone} (system/default)`,
      );
    }
  }

  async onModuleInit() {
    await this.repo.ensureEnvironmentConfig(
      LOCAL_ENVIRONMENT_ID,
      LOCAL_ENVIRONMENT_NAME,
    );
    const configs = await this.repo.listAll();
    for (const cfg of configs) {
      await this.applyFromDb(cfg.environmentId);
    }
  }

  async getConfig(environmentId = LOCAL_ENVIRONMENT_ID) {
    const existing = await this.repo.get(environmentId);
    if (existing) return existing;
    const environmentName =
      environmentId === LOCAL_ENVIRONMENT_ID
        ? LOCAL_ENVIRONMENT_NAME
        : await this.environments.getEnvironmentNameOrThrow(environmentId);
    await this.repo.ensureEnvironmentConfig(environmentId, environmentName);
    return this.repo.get(environmentId);
  }

  /**
   * ✅ Retorna config + runtime status (para UI)
   */
  async getStatus(environmentId = LOCAL_ENVIRONMENT_ID) {
    const cfg = await this.getConfig(environmentId);
    const state = this.getState(environmentId);
    const job = this.tryGetJob(environmentId);
    const nextScanAt = this.getNextDateSafe(job);

    return {
      config: cfg,
      runtime: {
        hasJob: Boolean(job),
        enabled: Boolean(cfg?.enabled),
        ticking: state.ticking,
        timeZone: this.timeZone,
        nextScanAt,
        lastRunAt: state.lastRunAt,
        lastFinishedAt: state.lastFinishedAt,
        lastError: state.lastError,
        lastResult: state.lastResult,
      },
    };
  }

  async updateConfig(environmentId = LOCAL_ENVIRONMENT_ID, patch: SchedulerPatch) {
    // valida cron se veio
    if (patch.cronExpr !== undefined) {
      this.assertCronValid(patch.cronExpr);
    }

    const environmentName =
      environmentId === LOCAL_ENVIRONMENT_ID
        ? LOCAL_ENVIRONMENT_NAME
        : await this.environments.getEnvironmentNameOrThrow(environmentId);
    const saved = await this.repo.upsert(environmentId, environmentName, patch);
    await this.applyFromDb(environmentId);
    return saved;
  }

  async applyFromDb(environmentId = LOCAL_ENVIRONMENT_ID) {
    const state = this.getState(environmentId);
    if (state.applying) {
      state.applyQueued = true;
      return;
    }
    state.applying = true;

    try {
      const cfg = await this.getConfig(environmentId);
      if (!cfg) return;

      const job = this.getOrCreateJob(environmentId);

      // sempre para antes de reaplicar
      void job.stop();

      if (!cfg.enabled) {
        this.logger.log(`Scheduler disabled (db) env=${environmentId}`);
        return;
      }

      // ✅ valida cron de verdade
      const cronTime = new CronTime(cfg.cronExpr, this.timeZone);
      job.setTime(cronTime);
      job.start();

      const next = this.getNextDateSafe(job);
      this.logger.log(
        `Scheduler enabled (db) env=${environmentId}. cron=${cfg.cronExpr} mode=${cfg.mode} scope=${cfg.scope} tz=${this.timeZone} next=${this.formatDateForLog(next)}`,
      );
    } catch (err: unknown) {
      // se algo der errado ao aplicar cron, loga (e não derruba app)
      this.logger.error(
        `applyFromDb failed env=${environmentId}: ${this.getErrorMessage(err)}`,
      );
      throw err;
    } finally {
      state.applying = false;
      if (state.applyQueued) {
        state.applyQueued = false;
        await this.applyFromDb(environmentId);
      }
    }
  }

  stop(environmentId = LOCAL_ENVIRONMENT_ID) {
    try {
      const job = this.schedule.getCronJob(this.jobName(environmentId));
      void job.stop();
      this.schedule.deleteCronJob(this.jobName(environmentId));
      this.logger.log(`Scheduler job removed env=${environmentId}`);
    } catch {
      // ok, não existia
    }
  }

  /**
   * ✅ Job criado UMA vez. Cron real vem do DB via setTime().
   */
  private getOrCreateJob(environmentId: string): CronJob {
    const existing = this.tryGetJob(environmentId);
    if (existing) return existing;
    const state = this.getState(environmentId);

    // placeholder (vai ser substituído por setTime)
    const job = new CronJob(
      '*/5 * * * *',
      async () => {
        if (state.ticking) return;
        state.ticking = true;

        state.lastRunAt = new Date();
        state.lastFinishedAt = null;
        state.lastError = null;
        state.lastResult = null;

        try {
          this.logger.log(`[scheduler] tick start env=${environmentId}`);

          const result = await this.orchestrator.scanAndEnqueueFromDb(
            environmentId,
          );
          state.lastResult = result;

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
            `[scheduler] tick ok env=${environmentId} mode=${mode} scanned=${scanned} queued=${queuedCount} skipped=${skippedCount}`,
          );

          this.logger.log(
            `[scheduler] tick ok env=${environmentId} mode=${mode} scanned=${scanned} queued=${queuedCount}`,
          );
        } catch (err: unknown) {
          const msg = this.getErrorMessage(err);
          state.lastError = msg;
          this.logger.error(`[scheduler] tick failed env=${environmentId}: ${msg}`);
          const cfg = await this.getConfig(environmentId);
          await this.notifications.emitSystemError(
            `Scheduler tick failed: ${msg}`,
            {
              scope: 'scheduler_tick',
            },
            undefined,
            {
              environmentId,
              environmentName: cfg?.environmentName ?? environmentId,
            },
          );
        } finally {
          state.lastFinishedAt = new Date();
          state.nextScanAt = this.safeNextScan(job);
          this.logger.log(
            `[scheduler] tick done env=${environmentId} finishedAt=${state.lastFinishedAt.toISOString()} next=${state.nextScanAt ? state.nextScanAt.toString() : '?'}`,
          );
          state.ticking = false;
        }
      },
      null,
      false,
      this.timeZone,
    );

    this.schedule.addCronJob(this.jobName(environmentId), job);
    this.logger.log(`Scheduler job registered env=${environmentId}`);
    return job;
  }

  private tryGetJob(environmentId: string): CronJob | null {
    try {
      return this.schedule.getCronJob(this.jobName(environmentId));
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
    if (!s) throw new BadRequestException(t('scheduler.cronExprRequired'));

    try {
      // ✅ isso valida mesmo (diferente do split em 5 campos)
      new CronTime(s, this.timeZone);
    } catch {
      throw new BadRequestException(t('scheduler.invalidCronExpr', { value: s }));
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
      return null;
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (!err || typeof err !== 'object') return String(err);
    const maybe = err as { message?: unknown };
    return typeof maybe.message === 'string'
      ? maybe.message
      : this.stringifyUnknown(err);
  }

  private normalizeTimeZone(raw?: string | null): string | undefined {
    const tz = String(raw ?? '').trim();
    return tz ? tz : undefined;
  }

  private resolveTimeZone(configured?: string): string {
    if (configured) return configured;

    try {
      const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
      if (resolved) return resolved;
    } catch {
      // fallback abaixo
    }

    return 'UTC';
  }

  private formatDateForLog(value: Date | null): string {
    return value ? value.toISOString() : '?';
  }

  private stringifyUnknown(value: unknown): string {
    try {
      return JSON.stringify(value) ?? '[unknown]';
    } catch {
      return '[unknown]';
    }
  }

  private getState(environmentId: string): SchedulerRuntimeState {
    let state = this.runtimeByEnvironment.get(environmentId);
    if (!state) {
      state = {
        applying: false,
        applyQueued: false,
        ticking: false,
        nextScanAt: null,
        lastRunAt: null,
        lastFinishedAt: null,
        lastError: null,
        lastResult: null,
      };
      this.runtimeByEnvironment.set(environmentId, state);
    }
    return state;
  }

  private jobName(environmentId: string) {
    return `${JOB_NAME}:${environmentId}`;
  }
}
