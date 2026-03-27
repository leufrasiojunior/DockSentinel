import { Module } from "@nestjs/common"
import { CryptoModule } from "../crypto/crypto.module"
import { DockerModule } from "../docker/docker.module"
import { NotificationsModule } from "../notifications/notifications.module"
import { PrismaModule } from "../prisma/prisma.module"
import { SettingsModule } from "../settings/settings.module"
import { UpdatesRepository } from "../updates/updates.repository"
import { UpdatesSchedulerRepository } from "../updates/updates.scheduler.repository"
import { EnvironmentHealthMonitorService } from "./environment-health-monitor.service"
import { EnvironmentsController } from "./environments.controller"
import { EnvironmentsRepository } from "./environments.repository"
import { EnvironmentsService } from "./environments.service"

@Module({
  imports: [PrismaModule, CryptoModule, DockerModule, SettingsModule, NotificationsModule],
  controllers: [EnvironmentsController],
  providers: [
    EnvironmentHealthMonitorService,
    EnvironmentsRepository,
    EnvironmentsService,
    UpdatesRepository,
    UpdatesSchedulerRepository,
  ],
  exports: [EnvironmentsRepository, EnvironmentsService],
})
export class EnvironmentsModule {}
