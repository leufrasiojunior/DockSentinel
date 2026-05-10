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
import { UpdatesRequestService } from "../updates/updates-request.service"

@ApiTags("Environment Updates")
@Controller("environments/:environmentId/updates")
export class EnvironmentUpdatesController {
  constructor(
    private readonly updates: UpdatesRequestService,
  ) {}

  @Post("enqueue")
  @ApiBody({ type: EnqueueDto })
  async enqueue(
    @Param("environmentId") environmentId: string,
    @Body(new ZodValidationPipe(enqueueSchema)) body: EnqueueDto,
  ) {
    return this.updates.enqueue(environmentId, body)
  }

  @Post("batch")
  @ApiBody({ type: BatchDto })
  async batch(
    @Param("environmentId") environmentId: string,
    @Body(new ZodValidationPipe(batchSchema)) body: BatchDto,
  ) {
    return this.updates.batch(environmentId, body)
  }

  @Get("jobs")
  async listJobs(
    @Param("environmentId") environmentId: string,
    @Query(new ZodValidationPipe(jobsQuerySchema)) query: JobsQuery,
  ) {
    return this.updates.listJobs(environmentId, query)
  }

  @Get("jobs/:id")
  async getJob(
    @Param("environmentId") environmentId: string,
    @Param("id") id: string,
  ) {
    return this.updates.getJob(environmentId, id)
  }

  @Post("kick")
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { ok: { type: "boolean", example: true } },
    },
  })
  async kick() {
    return this.updates.kick()
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
    return this.updates.scanAndEnqueue(environmentId, body)
  }
}
