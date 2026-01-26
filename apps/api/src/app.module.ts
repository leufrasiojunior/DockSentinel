import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"

import { AppConfigModule } from "./config/config.module"
import { SettingsModule } from "./settings/settings.module"
import { AuthModule } from "./auth/auth.module"
import { GlobalAuthGuard } from "./auth/global-auth.guard"
import { HealthModule } from "./health/health.module"
import { PrismaModule } from "./prisma/prisma.module"
import { CryptoModule } from "./crypto/crypto.module"
import { SetupModule } from "./setup/setup.module"
import { DockerModule } from "./docker/docker.module"


@Module({
  imports: [AppConfigModule, SettingsModule, AuthModule, HealthModule, PrismaModule, CryptoModule, SetupModule, DockerModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GlobalAuthGuard,
    },
  ],
})
export class AppModule {}
