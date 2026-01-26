import { Module } from "@nestjs/common"
import { SetupController } from "./setup.controller"
import { SetupService } from "./setup.service"
import { SettingsModule } from "../settings/settings.module"

/**
 * SetupModule:
 * - expõe a rota pública /setup
 * - usa SettingsService para aplicar a configuração inicial
 */
@Module({
  imports: [SettingsModule],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
