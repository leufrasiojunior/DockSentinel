import { Module } from "@nestjs/common"
import { SettingsService } from "./settings.service"
import { PrismaModule } from "../prisma/prisma.module"
import { SettingsRepository } from "./settings.repository"
import { CryptoModule } from "../crypto/crypto.module"
import { SettingsController } from "./settings.controller"

@Module({
  imports: [PrismaModule, CryptoModule],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository],
  exports: [SettingsService, SettingsRepository], // exporta para AuthGuard usar
})
export class SettingsModule {}
