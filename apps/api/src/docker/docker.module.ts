// docker.module.ts
import { Module } from "@nestjs/common"
import Docker from "dockerode"

import { DockerService } from "./docker.service"
import { DockerUpdateService } from "./docker-update.service"
import { DockerDigestService } from "./docker-digest.service"
import { DockerController } from "./docker.controller"
import { DOCKER_CLIENT } from "./docker.constants"

@Module({
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
  ],
  controllers: [DockerController],
  exports: [DOCKER_CLIENT, DockerService, DockerUpdateService, DockerDigestService],
})
export class DockerModule {}
