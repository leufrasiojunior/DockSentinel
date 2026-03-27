import { Module } from "@nestjs/common"
import { EnvironmentsModule } from "../environments/environments.module"
import { NotificationsModule } from "../notifications/notifications.module"
import { RuntimeModule } from "../runtime/runtime.module"
import { UpdatesModule } from "../updates/updates.module"
import { EnvironmentDockerController } from "./environment-docker.controller"
import { EnvironmentOverviewController } from "./environment-overview.controller"
import { EnvironmentOverviewService } from "./environment-overview.service"
import { EnvironmentNotificationsController } from "./environment-notifications.controller"
import { EnvironmentSchedulerController } from "./environment-scheduler.controller"
import { EnvironmentUpdatesController } from "./environment-updates.controller"

@Module({
  imports: [RuntimeModule, UpdatesModule, NotificationsModule, EnvironmentsModule],
  controllers: [
    EnvironmentOverviewController,
    EnvironmentDockerController,
    EnvironmentUpdatesController,
    EnvironmentSchedulerController,
    EnvironmentNotificationsController,
  ],
  providers: [EnvironmentOverviewService],
})
export class EnvironmentApiModule {}
