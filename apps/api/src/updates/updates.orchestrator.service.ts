import { Injectable, Logger } from '@nestjs/common';
import { DockerService } from 'src/docker/docker.service';
import { DockerUpdateService } from 'src/docker/docker-update.service';
import { UpdatesRepository } from './updates.repository';
import { UpdatesWorkerService } from './updates.worker.service';
import { UpdatesSchedulerRepository } from './updates.scheduler.repository';

@Injectable()
export class UpdatesOrchestratorService {
  private readonly logger = new Logger(UpdatesOrchestratorService.name);

  constructor(
    private readonly dockerService: DockerService,
    private readonly updater: DockerUpdateService,
    private readonly repo: UpdatesRepository,
    private readonly worker: UpdatesWorkerService,
    private readonly schedRepo: UpdatesSchedulerRepository,
  ) {}

  async scanAndEnqueueFromDb() {
    const cfg = await this.schedRepo.get();
    if (!cfg) throw new Error('Scheduler config missing');

    return this.scanAndEnqueue({
      mode: cfg.mode as any,
      updateLabelKey: cfg.updateLabelKey ?? 'docksentinel.update',
    });
  }

  private isAutoUpdateDisabled(labels: Record<string, string>, key: string) {
  const v = (labels?.[key] ?? "").trim().toLowerCase()
  return v === "false" || v === "0" || v === "no" || v === "off"
}


  async scanAndEnqueue(input: {
    mode: 'scan_only' | 'scan_and_update';
    updateLabelKey: string;
  }) {
    const all = await this.dockerService.listContainers();
    const selected = all; // ✅ SEMPRE SCAN EM TODOS

    const results: any[] = [];
    const toQueue: {
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
        const check = await this.updater.canUpdateContainer(name);

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
            container: name,
            image: check.imageRef, // atualiza usando a tag atual do container
            pull: true,
            force: false,
          });
        }
      } catch (err: any) {
        results.push({
          name,
          error: err?.message ?? String(err),
          autoUpdateDisabled,
          allowAutoUpdate,
        });
      }
    }

    if (input.mode === 'scan_and_update' && toQueue.length > 0) {
      const enq = await this.repo.enqueueMany(toQueue);

      // ✅ não esperar o worker terminar
      this.worker
        .kick()
        .catch((e) => this.logger.error(`worker kick failed: ${e}`));

      return {
        scanned: results.length,
        mode: input.mode,
        queued: enq,
        results,
      };
    }

    return { scanned: results.length, mode: input.mode, queued: null, results };
  }
}
