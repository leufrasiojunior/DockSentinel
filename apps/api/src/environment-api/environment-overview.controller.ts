import { Controller, Get } from "@nestjs/common"
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import { EnvironmentOverviewListDto } from "../environments/dto/environment.dto"
import { EnvironmentOverviewService } from "./environment-overview.service"

@ApiTags("Environments")
@Controller("environments")
export class EnvironmentOverviewController {
  constructor(private readonly overview: EnvironmentOverviewService) {}

  @Get("overview")
  @ApiOperation({ summary: "List environments with connection and container overview" })
  @ApiOkResponse({ type: EnvironmentOverviewListDto })
  async listOverview() {
    return this.overview.listOverview()
  }
}
