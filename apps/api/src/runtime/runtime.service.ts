import { Injectable } from "@nestjs/common"
import { LOCAL_ENVIRONMENT_ID } from "../environments/environment.constants"
import type { RecreateDto } from "../docker/dto/recreate.dto"
import type { UpdateDto } from "../docker/dto/update.dto"
import { LocalRuntimeClientService } from "./local-runtime-client.service"
import { RemoteRuntimeClientService } from "./remote-runtime-client.service"

@Injectable()
export class RuntimeService {
  constructor(
    private readonly local: LocalRuntimeClientService,
    private readonly remote: RemoteRuntimeClientService,
  ) {}

  async listContainers(environmentId: string) {
    return this.isLocal(environmentId)
      ? this.local.listContainers()
      : this.remote.listContainers(environmentId)
  }

  async getContainerDetails(environmentId: string, id: string) {
    return this.isLocal(environmentId)
      ? this.local.getContainerDetails(id)
      : this.remote.getContainerDetails(environmentId, id)
  }

  async buildRecreatePlan(environmentId: string, id: string) {
    return this.isLocal(environmentId)
      ? this.local.buildRecreatePlan(id)
      : this.remote.buildRecreatePlan(environmentId, id)
  }

  async updateCheck(environmentId: string, name: string) {
    return this.isLocal(environmentId)
      ? this.local.updateCheck(name)
      : this.remote.updateCheck(environmentId, name)
  }

  async recreateContainer(environmentId: string, name: string, body: RecreateDto) {
    return this.isLocal(environmentId)
      ? this.local.recreateContainer(name, body)
      : this.remote.recreateContainer(environmentId, name, body)
  }

  async updateContainer(environmentId: string, name: string, body: UpdateDto) {
    return this.isLocal(environmentId)
      ? this.local.updateContainer(name, body)
      : this.remote.updateContainer(environmentId, name, body)
  }

  private isLocal(environmentId: string) {
    return !environmentId || environmentId === LOCAL_ENVIRONMENT_ID
  }
}
