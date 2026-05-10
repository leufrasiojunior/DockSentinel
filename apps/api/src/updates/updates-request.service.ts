import { BadRequestException, Injectable, Logger } from "@nestjs/common"
import { EnvironmentsService } from "../environments/environments.service"
import {
  LOCAL_ENVIRONMENT_ID,
  LOCAL_ENVIRONMENT_NAME,
} from "../environments/environment.constants"
import { t } from "../i18n/translate"
import { type JobsQuery } from "./dto/updates.dto"
import { UpdatesOrchestratorService } from "./updates.orchestrator.service"
import { UpdatesRepository } from "./updates.repository"
import { UpdatesWorkerService } from "./updates.worker.service"

type ScanAndEnqueueBody = Partial<{
  mode: "scan_only" | "scan_and_update"
  updateLabelKey: string
}>

@Injectable()
export class UpdatesRequestService {
  private readonly logger = new Logger(UpdatesRequestService.name)

  constructor(
    private readonly repo: UpdatesRepository,
    private readonly worker: UpdatesWorkerService,
    private readonly orchestrator: UpdatesOrchestratorService,
    private readonly environments: EnvironmentsService,
  ) {}

  async enqueue(
    environmentId: string,
    body: {
      container: string
      image?: string | null
      force?: boolean
      pull?: boolean
    },
  ) {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId)
    const environmentName = await this.resolveEnvironmentName(resolvedEnvironmentId)
    const result = await this.repo.enqueueMany([
      {
        environmentId: resolvedEnvironmentId,
        environmentName,
        ...body,
      },
    ])

    this.kickWorker()
    return result
  }

  async batch(
    environmentId: string,
    body: {
      items?: Array<{
        container: string
        image?: string | null
        force?: boolean
        pull?: boolean
      }>
    },
  ) {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId)
    const environmentName = await this.resolveEnvironmentName(resolvedEnvironmentId)
    const result = await this.repo.enqueueMany(
      (body.items ?? []).map((item) => ({
        environmentId: resolvedEnvironmentId,
        environmentName,
        ...item,
      })),
    )

    this.kickWorker()
    return result
  }

  async listJobs(environmentId: string, query: JobsQuery) {
    return this.repo.listJobs({
      ...query,
      environmentId: this.resolveEnvironmentId(environmentId),
    })
  }

  async getJob(environmentId: string, id: string) {
    return this.repo.getJobOrThrow(id, this.resolveEnvironmentId(environmentId))
  }

  async kick() {
    this.kickWorker()
    return { ok: true as const }
  }

  async scanAndEnqueue(environmentId: string, body?: ScanAndEnqueueBody) {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId)

    if (!body || Object.keys(body).length === 0) {
      return this.orchestrator.scanAndEnqueueFromDb(resolvedEnvironmentId)
    }

    if (
      body.mode &&
      body.mode !== "scan_only" &&
      body.mode !== "scan_and_update"
    ) {
      throw new BadRequestException({
        message: t("updates.invalidMode", { value: String(body.mode) }),
        code: "INVALID_UPDATE_MODE",
      })
    }

    return this.orchestrator.scanAndEnqueue({
      environmentId: resolvedEnvironmentId,
      mode: body.mode ?? "scan_only",
      updateLabelKey: body.updateLabelKey?.trim() || "docksentinel.update",
    })
  }

  private resolveEnvironmentId(environmentId?: string) {
    return environmentId?.trim() || LOCAL_ENVIRONMENT_ID
  }

  private async resolveEnvironmentName(environmentId: string) {
    if (environmentId === LOCAL_ENVIRONMENT_ID) {
      return LOCAL_ENVIRONMENT_NAME
    }

    return this.environments.getEnvironmentNameOrThrow(environmentId)
  }

  private kickWorker() {
    this.worker.kick().catch((error: unknown) => {
      this.logger.error(
        "[UpdatesWorker] kick failed",
        error instanceof Error ? error.stack : String(error),
      )
    })
  }
}
