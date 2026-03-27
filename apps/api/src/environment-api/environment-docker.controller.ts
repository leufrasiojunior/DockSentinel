import { Body, Controller, Get, Param, Post } from "@nestjs/common"
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe"
import { RecreateDto } from "../docker/dto/recreate.dto"
import { UpdateDto, updateBodySchema } from "../docker/dto/update.dto"
import { recreateBodySchema } from "../docker/docker.schema"
import { EnvironmentsService } from "../environments/environments.service"
import { NotificationsService } from "../notifications/notifications.service"
import { RuntimeService } from "../runtime/runtime.service"

@ApiTags("Environment Docker")
@Controller("environments/:environmentId/docker")
export class EnvironmentDockerController {
  constructor(
    private readonly runtime: RuntimeService,
    private readonly notifications: NotificationsService,
    private readonly environments: EnvironmentsService,
  ) {}

  @Get("containers")
  @ApiOperation({ summary: "List containers for an environment" })
  @ApiOkResponse({ description: "Container list" })
  async listContainers(@Param("environmentId") environmentId: string) {
    return this.runtime.listContainers(environmentId)
  }

  @Get("containers/:id")
  async getContainerDetails(
    @Param("environmentId") environmentId: string,
    @Param("id") id: string,
  ) {
    return this.runtime.getContainerDetails(environmentId, id)
  }

  @Get("containers/:id/recreate-plan")
  async getRecreatePlan(
    @Param("environmentId") environmentId: string,
    @Param("id") id: string,
  ) {
    return this.runtime.buildRecreatePlan(environmentId, id)
  }

  @Get("containers/:name/update-check")
  async updateCheck(
    @Param("environmentId") environmentId: string,
    @Param("name") name: string,
  ) {
    const environmentName =
      await this.environments.getEnvironmentNameOrThrow(environmentId)

    try {
      const result = await this.runtime.updateCheck(environmentId, name)

      if (!result.canCheckRemote) {
        await this.notifications.emitScanError(
          {
            mode: "manual_check",
            scanned: 1,
            errors: 1,
            container: name,
            imageRef: result.imageRef,
            reason: result.reason,
            scannedImages: [`${name} => ${result.imageRef}`],
            updateCandidates: [],
          },
          undefined,
          { environmentId, environmentName },
        )
      } else {
        await this.notifications.emitScanInfo(
          {
            mode: "manual_check",
            scanned: 1,
            scannedImages: [`${name} => ${result.imageRef}`],
            updateCandidates: result.hasUpdate ? [`${name} => ${result.imageRef}`] : [],
          },
          undefined,
          { environmentId, environmentName },
        )
      }

      return result
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      await this.notifications.emitSystemError(
        `Falha em update-check manual: ${name} -> ${message}`,
        { container: name },
        undefined,
        { environmentId, environmentName },
      )
      throw error
    }
  }

  @Post("containers/:name/recreate")
  @ApiBody({ type: RecreateDto })
  async recreate(
    @Param("environmentId") environmentId: string,
    @Param("name") name: string,
    @Body(new ZodValidationPipe(recreateBodySchema)) body: RecreateDto,
  ) {
    return this.runtime.recreateContainer(environmentId, name, body)
  }

  @Post("containers/:name/update")
  @ApiBody({ type: UpdateDto })
  async updateContainer(
    @Param("environmentId") environmentId: string,
    @Param("name") name: string,
    @Body(new ZodValidationPipe(updateBodySchema)) body: UpdateDto,
  ) {
    return this.runtime.updateContainer(environmentId, name, body)
  }
}
