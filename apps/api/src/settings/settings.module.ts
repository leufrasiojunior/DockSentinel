import { Module } from "@nestjs/common"
import { SettingsService } from "./settings.service"
import { PrismaModule } from "../prisma/prisma.module"
import { SettingsRepository } from "./settings.repository"
import { CryptoModule } from "../crypto/crypto.module"
import { SettingsController } from "./settings.controller"
import { SettingsTotpController } from "./settings-totp.controller"
import { TotpEnrollmentService } from "./totp-enrollment.service"

@Module({
  imports: [PrismaModule, CryptoModule],
  controllers: [SettingsController, SettingsTotpController],
  providers: [SettingsService, SettingsRepository, TotpEnrollmentService],
  exports: [SettingsService, SettingsRepository],
})
export class SettingsModule {}
