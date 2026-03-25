import { Body, Controller, Get, Param, Patch } from "@nestjs/common"
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe"
import { UpdateSchedulerConfigPatchDto, schedulerPatchSchema } from "../updates/dto/updates-scheduler.dto"
import { UpdatesSchedulerService } from "../updates/updates.scheduler.service"

@ApiTags("Environment Scheduler")
@Controller("environments/:environmentId/scheduler")
export class EnvironmentSchedulerController {
  constructor(private readonly scheduler: UpdatesSchedulerService) {}

  @Get("config")
  @ApiOperation({ summary: "Get scheduler config for an environment" })
  async getConfig(@Param("environmentId") environmentId: string) {
    return this.scheduler.getConfig(environmentId)
  }

  @Patch("config")
  @ApiBody({ type: UpdateSchedulerConfigPatchDto })
  async updateConfig(
    @Param("environmentId") environmentId: string,
    @Body(new ZodValidationPipe(schedulerPatchSchema))
    body: UpdateSchedulerConfigPatchDto,
  ) {
    return this.scheduler.updateConfig(environmentId, body)
  }

  @Get("status")
  async getStatus(@Param("environmentId") environmentId: string) {
    return this.scheduler.getStatus(environmentId)
  }
}
