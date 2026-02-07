import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"

import { AppConfigModule } from "./config/config.module"
import { SettingsModule } from "./settings/settings.module"
import { AuthModule } from "./auth/auth.module"
import { GlobalAuthGuard } from "./auth/global-auth.guard"
import { HealthModule } from "./health/health.module"
import { PrismaModule } from "./prisma/prisma.module"
import { CryptoModule } from "./crypto/crypto.module"
import { DockerModule } from "./docker/docker.module"
import { UpdatesModule } from "./updates/updates.module"
import { ScheduleModule } from "@nestjs/schedule"


@Module({
  imports: [ScheduleModule.forRoot(),AppConfigModule, SettingsModule, AuthModule, HealthModule, PrismaModule, CryptoModule, DockerModule, UpdatesModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GlobalAuthGuard,
    },
  ],
})
export class AppModule {}
