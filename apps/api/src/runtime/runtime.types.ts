import type { ContainerDetailsDto } from "../docker/dto/container-details.dto"
import type { ContainerSummary } from "../docker/docker.service"
import type { RecreateDto } from "../docker/dto/recreate.dto"
import type { RecreatePlanDto } from "../docker/dto/recreate-plan.dto"
import type { UpdateDto } from "../docker/dto/update.dto"
import type { ContainerUpdateCheck } from "../docker/docker-update.service"

export interface RuntimeClient {
  listContainers(environmentId: string): Promise<ContainerSummary[]>
  getContainerDetails(environmentId: string, id: string): Promise<ContainerDetailsDto>
  buildRecreatePlan(environmentId: string, id: string): Promise<RecreatePlanDto>
  updateCheck(environmentId: string, name: string): Promise<ContainerUpdateCheck>
  recreateContainer(environmentId: string, name: string, body: RecreateDto): Promise<unknown>
  updateContainer(environmentId: string, name: string, body: UpdateDto): Promise<unknown>
}
