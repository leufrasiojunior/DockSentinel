import { Body, Controller, Get, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

/**
 * /settings:
 * - endpoints para UI configurar o DockSentinel
 * - protegido pelo GlobalAuthGuard (não é @Public)
 */
@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get safe settings' })
  @ApiResponse({
    status: 200,
    description: 'Returns the safe settings.',
  })
  async get() {
    /**
     * Retorna settings “seguros”:
     * - não retorna hash de senha
     * - não retorna totpSecretEnc
     */
    return this.settings.getSafeSettings();
  }

  @Put()
  @ApiOperation({ summary: 'Update settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid settings provided.' })
  async update(@Body() dto: UpdateSettingsDto) {
    return this.settings.updateSettings(dto);
  }
}
