import { Injectable, Logger } from "@nestjs/common";
import { DockerUpdateService } from "../docker/docker-update.service";
import { UpdateJob, UpdateJobPayload } from "./updates.types";

@Injectable()
export class UpdatesQueueService {
  private readonly logger = new Logger(UpdatesQueueService.name);

  private running = false;
  private queue: string[] = [];
  private jobs = new Map<string, UpdateJob>();

  constructor(private readonly updater: DockerUpdateService) {}

  createJob(payload: UpdateJobPayload): UpdateJob {
    const id = `job_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const job: UpdateJob = {
      id,
      status: "queued",
      createdAt: new Date().toISOString(),
      payload,
    };

    this.jobs.set(id, job);
    this.queue.push(id);

    this.kick();
    return job;
  }

  getJob(id: string): UpdateJob | undefined {
    return this.jobs.get(id);
  }

  listJobs(limit = 30): UpdateJob[] {
    // retorna os últimos jobs por createdAt
    return Array.from(this.jobs.values())
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit);
  }

  private async kick() {
    if (this.running) return;
    this.running = true;

    try {
      while (this.queue.length > 0) {
        const id = this.queue.shift()!;
        const job = this.jobs.get(id);
        if (!job) continue;

        job.status = "running";
        job.startedAt = new Date().toISOString();

        try {
          const { container, image, force, pull } = job.payload;

          // se image não vier, seu service já sabe descobrir no controller,
          // mas aqui a gente exige mandar (ou você pode replicar a lógica aqui)
          const targetImage = image ?? "";

          const result = await this.updater.recreateContainerWithImage(
            container,
            targetImage,
            { force, pull },
          );

          job.result = result;
          job.status = "success";
        } catch (err: any) {
          job.error = err?.message ?? String(err);
          job.status = "failed";
          this.logger.error(`[${job.id}] failed: ${job.error}`);
        } finally {
          job.finishedAt = new Date().toISOString();
        }
      }
    } finally {
      this.running = false;
    }
  }
}
