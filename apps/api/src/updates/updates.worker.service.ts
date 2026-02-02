import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { UpdatesRepository } from "./updates.repository"
import { DockerUpdateService } from "../docker/docker-update.service"

@Injectable()
export class UpdatesWorkerService implements OnModuleInit {
  private readonly logger = new Logger(UpdatesWorkerService.name)
  private running = false

  constructor(
    private readonly repo: UpdatesRepository,
    private readonly updater: DockerUpdateService,
  ) {}

  async onModuleInit() {
    // 1) ao subir, reseta jobs “running” que ficaram travados
    await this.repo.resetStaleRunning()

    // 2) liga o loop
    this.kick()
  }

  async kick() {
    if (this.running) return
    this.running = true

    try {
      while (true) {
        const job = await this.repo.claimNextQueued()
        if (!job) break

        try {
          // Se image vier vazio, você pode optar por descobrir via inspect aqui
          if (!job.image) {
            throw new Error("Job has no image. Send image or implement auto-detect here.")
          }

          const result = await this.updater.recreateContainerWithImage(
            job.container,
            job.image,
            { force: job.force, pull: job.pull },
          )

          await this.repo.markSuccess(job.id, result)
        } catch (err: any) {
          const msg = err?.message ?? String(err)
          this.logger.error(`[${job.id}] failed: ${msg}`)
          await this.repo.markFailed(job.id, msg)
        }
      }
    } finally {
      this.running = false
    }
  }
}
