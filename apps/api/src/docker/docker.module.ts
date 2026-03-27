// docker.module.ts
import { Module } from "@nestjs/common"
import Docker from "dockerode"

import { DockerService } from "./docker.service"
import { DockerUpdateService } from "./docker-update.service"
import { DockerDigestService } from "./docker-digest.service"
import { DockerController } from "./docker.controller"
import { DOCKER_CLIENT } from "./docker.constants"
import { NotificationsModule } from "../notifications/notifications.module"
import { DockerOperationsService } from "./docker-operations.service"

@Module({
  imports: [NotificationsModule],
  providers: [
    {
      provide: DOCKER_CLIENT,
      useFactory: () => {
        return new Docker({ socketPath: "/var/run/docker.sock" })
      },
    },
    DockerService,
    DockerUpdateService,
    DockerDigestService,
    DockerOperationsService,
  ],
  controllers: [DockerController],
  exports: [
    DOCKER_CLIENT,
    DockerService,
    DockerUpdateService,
    DockerDigestService,
    DockerOperationsService,
  ],
})
export class DockerModule {}
