import { Module } from "@nestjs/common";
import { UpdatesController } from "./updates.controller";
import { DockerModule } from "../docker/docker.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { UpdatesWorkerService } from "./updates.worker.service";
import { UpdatesRepository } from "./updates.repository";
import { UpdatesScanService } from "./updates.scan.service";
import { UpdatesSchedulerService } from "./updates.scheduler.service";
import { UpdatesQueueService } from "./updates.queue.service";
import { UpdatesSchedulerRepository } from "./updates.scheduler.repository";
import { UpdatesOrchestratorService } from "./updates.orchestrator.service";

@Module({
  imports: [DockerModule, PrismaModule],
  controllers: [UpdatesController],
  providers: [
    UpdatesRepository,
    UpdatesQueueService,
    UpdatesWorkerService,
    UpdatesSchedulerRepository,
    UpdatesSchedulerService,
    UpdatesOrchestratorService,
  ],
  exports: [UpdatesWorkerService],
})

export class UpdatesModule {}
