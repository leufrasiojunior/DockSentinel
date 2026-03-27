import { Injectable } from "@nestjs/common"
import { DockerOperationsService } from "../docker/docker-operations.service"
import { DockerService } from "../docker/docker.service"
import type { RecreateDto } from "../docker/dto/recreate.dto"
import type { UpdateDto } from "../docker/dto/update.dto"

@Injectable()
export class LocalRuntimeClientService {
  constructor(
    private readonly dockerService: DockerService,
    private readonly operations: DockerOperationsService,
  ) {}

  listContainers() {
    return this.dockerService.listContainers()
  }

  getContainerDetails(id: string) {
    return this.dockerService.getContainerDetails(id)
  }

  buildRecreatePlan(id: string) {
    return this.dockerService.buildRecreatePlan(id)
  }

  updateCheck(name: string) {
    return this.operations.updateCheck(name)
  }

  recreateContainer(name: string, body: RecreateDto) {
    return this.operations.recreateContainer(name, body)
  }

  updateContainer(name: string, body: UpdateDto) {
    return this.operations.updateContainer(name, body)
  }
}
