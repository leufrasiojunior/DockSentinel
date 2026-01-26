import { Body, Controller, Get, Put } from "@nestjs/common"
import { SettingsService } from "./settings.service"
import { UpdateSettingsSchema, type UpdateSettingsDto } from "./dto/update-settings.dto"

/**
 * /settings:
 * - endpoints para UI configurar o DockSentinel
 * - protegido pelo GlobalAuthGuard (não é @Public)
 */
@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async get() {
    /**
     * Retorna settings “seguros”:
     * - não retorna hash de senha
     * - não retorna totpSecretEnc
     */
    return this.settings.getSafeSettings()
  }

  @Put()
  async update(@Body() body: unknown) {
    // valida body com zod
    const dto: UpdateSettingsDto = UpdateSettingsSchema.parse(body)
    return this.settings.updateSettings(dto)
  }
}
