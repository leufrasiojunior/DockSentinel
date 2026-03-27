import { Injectable, Logger } from '@nestjs/common';
import { type ContainerUpdateCheck } from 'src/docker/docker-update.service';
import { UpdatesRepository } from './updates.repository';
import { UpdatesWorkerService } from './updates.worker.service';
import { UpdatesSchedulerRepository } from './updates.scheduler.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { RuntimeService } from '../runtime/runtime.service';
import { EnvironmentsService } from '../environments/environments.service';
import { LOCAL_ENVIRONMENT_ID } from '../environments/environment.constants';

export type ScanMode = 'scan_only' | 'scan_and_update';
export type ScanScope = 'all' | 'labeled';
export type EnqueueManyResult = {
  queued: Array<{ container: string; jobId: string }>;
  skipped: Array<{ container: string; reason: 'already_queued' }>;
};
export type ScanResult =
  | (ContainerUpdateCheck & {
      name: string;
      autoUpdateDisabled: boolean;
      allowAutoUpdate: boolean;
    })
  | {
      name: string;
      error: string;
      autoUpdateDisabled: boolean;
      allowAutoUpdate: boolean;
    };
export type ScanAndEnqueueResult = {
  scanned: number;
  mode: ScanMode;
  queued: EnqueueManyResult | null;
  results: ScanResult[];
};

@Injectable()
export class UpdatesOrchestratorService {
  private readonly logger = new Logger(UpdatesOrchestratorService.name);

  constructor(
    private readonly runtime: RuntimeService,
    private readonly repo: UpdatesRepository,
    private readonly worker: UpdatesWorkerService,
    private readonly schedRepo: UpdatesSchedulerRepository,
    private readonly notifications: NotificationsService,
    private readonly environments: EnvironmentsService,
  ) {}

  async scanAndEnqueueFromDb(
    environmentId = LOCAL_ENVIRONMENT_ID,
  ): Promise<ScanAndEnqueueResult> {
    const cfg = await this.schedRepo.get(environmentId);
    if (!cfg) throw new Error('Scheduler config missing');

    return this.scanAndEnqueue({
      environmentId,
      mode: this.normalizeMode(cfg.mode),
      scope: this.normalizeScope(cfg.scope),
      scanLabelKey: cfg.scanLabelKey ?? 'docksentinel.scan',
      updateLabelKey: cfg.updateLabelKey ?? 'docksentinel.update',
    });
  }

  private isAutoUpdateDisabled(labels: Record<string, string>, key: string) {
    const v = (labels?.[key] ?? '').trim().toLowerCase();
    return v === 'false' || v === '0' || v === 'no' || v === 'off';
  }

  private isScanEnabled(labels: Record<string, string>, key: string) {
    const v = (labels?.[key] ?? '').trim().toLowerCase();
    if (!v) return false;
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
  }

  async scanAndEnqueue(input: {
    environmentId: string;
    mode: ScanMode;
    scope?: ScanScope;
    scanLabelKey?: string;
    updateLabelKey: string;
  }): Promise<ScanAndEnqueueResult> {
    const environmentName = await this.environments.getEnvironmentNameOrThrow(
      input.environmentId,
    );
    const all = await this.runtime.listContainers(input.environmentId);
    const scope = input.scope ?? 'all';
    const scanLabelKey = input.scanLabelKey ?? 'docksentinel.scan';
    const selected =
      scope === 'labeled'
        ? all.filter((c) =>
            this.isScanEnabled(c.labels ?? {}, scanLabelKey),
          )
        : all;

    const results: ScanResult[] = [];
    const toQueue: {
      environmentId: string;
      environmentName: string;
      container: string;
      image?: string | null;
      force?: boolean;
      pull?: boolean;
    }[] = [];

    for (const c of selected) {
      const name = c.name || c.id;
      if (!name) continue;

      const labels = c.labels ?? {};

      if (!name) continue;
      const autoUpdateDisabled = this.isAutoUpdateDisabled(
        labels,
        input.updateLabelKey,
      );
      const allowAutoUpdate = !autoUpdateDisabled;

      try {
        const check = await this.runtime.updateCheck(input.environmentId, name);

        results.push({
          name,
          ...check,
          autoUpdateDisabled,
          allowAutoUpdate,
        });

        if (
          input.mode === 'scan_and_update' &&
          check.hasUpdate &&
          allowAutoUpdate
        ) {
          toQueue.push({
            environmentId: input.environmentId,
            environmentName,
            container: name,
            image: check.imageRef, // atualiza usando a tag atual do container
            pull: true,
            force: false,
          });
        }
      } catch (err: unknown) {
        results.push({
          name,
          error: this.getErrorMessage(err),
          autoUpdateDisabled,
          allowAutoUpdate,
        });
      }
    }

    const errored = results.filter((r) => 'error' in r).length;
    const hasAnyError = errored > 0;
    const scannedImages = results.map((r) => {
      if ('error' in r) return `${r.name} (erro)`;
      const image = r.imageRef ?? 'n/a';
      return `${r.name} => ${image}`;
    });
    const updateCandidates: string[] = [];
    for (const r of results) {
      if (!('error' in r) && r.hasUpdate) {
        updateCandidates.push(`${r.name} => ${r.imageRef ?? 'n/a'}`);
      }
    }
    if (input.mode === 'scan_and_update' && toQueue.length > 0) {
      const enq = await this.repo.enqueueMany(toQueue);

      // ✅ não esperar o worker terminar
      this.worker
        .kick()
        .catch((e: unknown) =>
          this.logger.error(`worker kick failed: ${this.getErrorMessage(e)}`),
        );

      if (hasAnyError) {
        await this.notifications.emitScanError({
          mode: input.mode,
          scanned: results.length,
          queued: enq.queued.length,
          errors: errored,
          scannedImages,
          updateCandidates,
        }, undefined, {
          environmentId: input.environmentId,
          environmentName,
        });
      } else {
        await this.notifications.emitScanInfo({
          mode: input.mode,
          scanned: results.length,
          queued: enq.queued.length,
          scannedImages,
          updateCandidates,
        }, undefined, {
          environmentId: input.environmentId,
          environmentName,
        });
      }

      return {
        scanned: results.length,
        mode: input.mode,
        queued: enq,
        results,
      };
    }

    if (hasAnyError) {
      await this.notifications.emitScanError({
        mode: input.mode,
        scanned: results.length,
        errors: errored,
        scannedImages,
        updateCandidates,
      }, undefined, {
        environmentId: input.environmentId,
        environmentName,
      });
    } else {
      await this.notifications.emitScanInfo({
        mode: input.mode,
        scanned: results.length,
        scannedImages,
        updateCandidates,
      }, undefined, {
        environmentId: input.environmentId,
        environmentName,
      });
    }

    return { scanned: results.length, mode: input.mode, queued: null, results };
  }

  private normalizeMode(value: unknown): ScanMode {
    return value === 'scan_and_update' ? 'scan_and_update' : 'scan_only';
  }

  private normalizeScope(value: unknown): ScanScope {
    return value === 'labeled' ? 'labeled' : 'all';
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (!err || typeof err !== 'object') return String(err);
    const maybe = err as { message?: unknown };
    return typeof maybe.message === 'string' ? maybe.message : String(err);
  }
}
