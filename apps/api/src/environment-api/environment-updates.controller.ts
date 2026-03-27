import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common"
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe"
import {
  BatchDto,
  batchSchema,
  EnqueueDto,
  enqueueSchema,
  jobsQuerySchema,
  type JobsQuery,
} from "../updates/dto/updates.dto"
import { UpdatesRepository } from "../updates/updates.repository"
import { UpdatesWorkerService } from "../updates/updates.worker.service"
import { UpdatesOrchestratorService } from "../updates/updates.orchestrator.service"
import { EnvironmentsService } from "../environments/environments.service"

@ApiTags("Environment Updates")
@Controller("environments/:environmentId/updates")
export class EnvironmentUpdatesController {
  constructor(
    private readonly repo: UpdatesRepository,
    private readonly worker: UpdatesWorkerService,
    private readonly orchestrator: UpdatesOrchestratorService,
    private readonly environments: EnvironmentsService,
  ) {}

  @Post("enqueue")
  @ApiBody({ type: EnqueueDto })
  async enqueue(
    @Param("environmentId") environmentId: string,
    @Body(new ZodValidationPipe(enqueueSchema)) body: EnqueueDto,
  ) {
    const environmentName =
      await this.environments.getEnvironmentNameOrThrow(environmentId)
    const result = await this.repo.enqueueMany([
      {
        environmentId,
        environmentName,
        ...body,
      },
    ])
    this.worker.kick().catch(() => undefined)
    return result
  }

  @Post("batch")
  @ApiBody({ type: BatchDto })
  async batch(
    @Param("environmentId") environmentId: string,
    @Body(new ZodValidationPipe(batchSchema)) body: BatchDto,
  ) {
    const environmentName =
      await this.environments.getEnvironmentNameOrThrow(environmentId)
    const result = await this.repo.enqueueMany(
      (body.items ?? []).map((item) => ({
        environmentId,
        environmentName,
        ...item,
      })),
    )
    this.worker.kick().catch(() => undefined)
    return result
  }

  @Get("jobs")
  async listJobs(
    @Param("environmentId") environmentId: string,
    @Query(new ZodValidationPipe(jobsQuerySchema)) query: JobsQuery,
  ) {
    return this.repo.listJobs({
      ...query,
      environmentId,
    })
  }

  @Get("jobs/:id")
  async getJob(@Param("id") id: string) {
    return this.repo.getJobOrThrow(id)
  }

  @Post("kick")
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { ok: { type: "boolean", example: true } },
    },
  })
  async kick() {
    this.worker.kick().catch(() => undefined)
    return { ok: true }
  }

  @Post("scan-and-enqueue")
  async scanAndEnqueue(
    @Param("environmentId") environmentId: string,
    @Body()
    body?: Partial<{
      mode: "scan_only" | "scan_and_update"
      updateLabelKey: string
    }>,
  ) {
    if (!body || Object.keys(body).length === 0) {
      return this.orchestrator.scanAndEnqueueFromDb(environmentId)
    }

    return this.orchestrator.scanAndEnqueue({
      environmentId,
      mode: body.mode ?? "scan_only",
      updateLabelKey: body.updateLabelKey?.trim() || "docksentinel.update",
    })
  }
}
