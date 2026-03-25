import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common"
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe"
import {
  createRemoteEnvironmentSchema,
  CreateRemoteEnvironmentDto,
  EnvironmentDto,
  EnvironmentListDto,
  RemoteEnvironmentMutationDto,
  RemoteEnvironmentTestDto,
  UpdateRemoteEnvironmentDto,
  updateRemoteEnvironmentSchema,
} from "./dto/environment.dto"
import { EnvironmentsService } from "./environments.service"

@ApiTags("Environments")
@Controller("environments")
export class EnvironmentsController {
  constructor(private readonly environments: EnvironmentsService) {}

  @Get()
  @ApiOperation({ summary: "List environments" })
  @ApiOkResponse({ type: EnvironmentListDto })
  async list() {
    return this.environments.listEnvironments()
  }

  @Post("remote")
  @ApiOperation({ summary: "Create remote environment" })
  @ApiBody({ type: CreateRemoteEnvironmentDto })
  @ApiOkResponse({ type: RemoteEnvironmentMutationDto })
  async createRemote(
    @Body(new ZodValidationPipe(createRemoteEnvironmentSchema))
    body: CreateRemoteEnvironmentDto,
  ) {
    return this.environments.createRemoteEnvironment(body)
  }

  @Patch("remote/:id")
  @ApiOperation({ summary: "Update remote environment" })
  @ApiBody({ type: UpdateRemoteEnvironmentDto })
  @ApiOkResponse({ type: EnvironmentDto })
  async updateRemote(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateRemoteEnvironmentSchema))
    body: UpdateRemoteEnvironmentDto,
  ) {
    return this.environments.updateRemoteEnvironment(id, body)
  }

  @Post("remote/:id/test")
  @ApiOperation({ summary: "Test remote environment connectivity" })
  @ApiOkResponse({ type: RemoteEnvironmentTestDto })
  async testRemote(@Param("id") id: string) {
    return this.environments.testEnvironment(id)
  }

  @Post("remote/:id/rotate-token")
  @ApiOperation({ summary: "Rotate remote environment token" })
  @ApiOkResponse({ type: RemoteEnvironmentMutationDto })
  async rotateToken(@Param("id") id: string) {
    return this.environments.rotateRemoteToken(id)
  }

  @Delete("remote/:id")
  @ApiOperation({ summary: "Delete remote environment" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { ok: { type: "boolean", example: true } },
    },
  })
  async deleteRemote(@Param("id") id: string) {
    return this.environments.deleteRemoteEnvironment(id)
  }
}
