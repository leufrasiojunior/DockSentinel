import { Injectable, Logger } from "@nestjs/common";
import { DockerService } from "../docker/docker.service";
import type { ContainerSummary } from "../docker/docker.service";
import { DockerUpdateService } from "../docker/docker-update.service";
import { UpdatesRepository } from "./updates.repository";
import { UpdatesWorkerService } from "./updates.worker.service";

@Injectable()
export class UpdatesScanService {
  private readonly logger = new Logger(UpdatesScanService.name);

  constructor(
    private readonly dockerService: DockerService,
    private readonly updater: DockerUpdateService,
    private readonly repo: UpdatesRepository,
    private readonly worker: UpdatesWorkerService,
  ) {}

  /**
   * Scan containers -> se hasUpdate=true, enqueue.
   * Depois dispara worker.kick() sem bloquear request/cron.
   */
  async scanAndEnqueue(opts?: {
    onlyRunning?: boolean;
    pull?: boolean;
    force?: boolean;
    limit?: number;
  }) {
    const onlyRunning = opts?.onlyRunning ?? true;
    const pull = opts?.pull ?? true;
    const force = opts?.force ?? false;
    const limit = opts?.limit ?? 200;

    const containers = await this.dockerService.listContainers();

    const filtered: ContainerSummary[] = onlyRunning
      ? containers.filter((c) => c.state === "running")
      : containers;

    const targets = filtered.map((c) => c.name).slice(0, limit);

    const itemsToEnqueue: {
      container: string;
      image?: string | null;
      force?: boolean;
      pull?: boolean;
    }[] = [];

    const skipped: Array<{
      container: string;
      reason: "cannot_check" | "up_to_date" | "scan_error";
      error?: string;
    }> = [];

    // v0: sequencial (mais simples e confiável).
    // Depois a gente coloca concorrência limitada (p-limit).
    for (const name of targets) {
      try {
        const check = await this.updater.canUpdateContainer(name);

        if (!check.canCheckRemote || !check.canCheckLocal) {
          skipped.push({ container: name, reason: "cannot_check" });
          continue;
        }

        if (!check.hasUpdate) {
          skipped.push({ container: name, reason: "up_to_date" });
          continue;
        }

        itemsToEnqueue.push({
          container: name,
          image: check.imageRef, // importante: enfileira com a própria tag atual do container
          pull,
          force,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        skipped.push({ container: name, reason: "scan_error", error: msg });
      }
    }

    const result = await this.repo.enqueueMany(itemsToEnqueue);

    // IMPORTANT: não await aqui pra não “travar” request/cron.
    this.worker.kick().catch((err) => {
      this.logger.error("worker.kick failed", err);
    });

    return {
      scanned: targets.length,
      considered: itemsToEnqueue.length + skipped.length,
      toEnqueue: itemsToEnqueue.length,
      enqueue: result,
      skipped,
    };
  }
}
