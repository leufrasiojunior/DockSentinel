import { Module } from "@nestjs/common";
import { UpdatesController } from "./updates.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { UpdatesWorkerService } from "./updates.worker.service";
import { UpdatesRepository } from "./updates.repository";
import { UpdatesSchedulerService } from "./updates.scheduler.service";
import { UpdatesSchedulerRepository } from "./updates.scheduler.repository";
import { UpdatesOrchestratorService } from "./updates.orchestrator.service";
import { UpdatesSchedulerController } from "./updates.scheduler.controller";
import { NotificationsModule } from "src/notifications/notifications.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { EnvironmentsModule } from "../environments/environments.module";

@Module({
  imports: [RuntimeModule, EnvironmentsModule, PrismaModule, NotificationsModule],
  controllers: [UpdatesController, UpdatesSchedulerController],
  providers: [
    UpdatesRepository,
    UpdatesWorkerService,
    UpdatesSchedulerRepository,
    UpdatesSchedulerService,
    UpdatesOrchestratorService,
  ],
  exports: [
    UpdatesRepository,
    UpdatesWorkerService,
    UpdatesSchedulerService,
    UpdatesOrchestratorService,
  ],
})

export class UpdatesModule {}
