import { Body, Controller, Get, Patch } from "@nestjs/common"
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe" // ajuste caminho

import { UpdatesSchedulerService } from "./updates.scheduler.service"
import { SchedulerConfigDto, schedulerPatchSchema, UpdateSchedulerConfigPatchDto } from "./dto/updates-scheduler.dto"

@ApiTags("updates")
@Controller("updates/scheduler")
export class UpdatesSchedulerController {
  constructor(private readonly scheduler: UpdatesSchedulerService) {}

  @Get("config")
  @ApiOperation({ summary: "Get updates scheduler config (DB singleton)" })
  @ApiResponse({ status: 200, type: SchedulerConfigDto })
  async getConfig() {
    return this.scheduler.getConfig()
  }

  @Patch("config")
  @ApiOperation({ summary: "Update updates scheduler config (DB) and apply immediately" })
  @ApiBody({ type: UpdateSchedulerConfigPatchDto })
  @ApiResponse({ status: 200, type: SchedulerConfigDto })
  async updateConfig(
    @Body(new ZodValidationPipe(schedulerPatchSchema)) body: UpdateSchedulerConfigPatchDto,
  ) {
    // body já validado pelo ZodValidationPipe
    return this.scheduler.updateConfig(body)
  }
}
