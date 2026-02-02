import { Module } from "@nestjs/common";
import { UpdatesQueueService } from "./updates.queue.service";
import { UpdatesController } from "./updates.controller";
import { DockerModule } from "../docker/docker.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { UpdatesWorkerService } from "./updates.worker.service";
import { DockerUpdateService } from "src/docker/docker-update.service";
import { UpdatesRepository } from "./updates.repository";

@Module({
  imports: [DockerModule, PrismaModule],
  controllers: [UpdatesController],
  providers: [UpdatesQueueService, UpdatesWorkerService, UpdatesRepository],
  exports: [UpdatesWorkerService],
})
export class UpdatesModule {}
