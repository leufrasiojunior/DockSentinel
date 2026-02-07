import { Body, Controller, Get, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SafeSettingsDto } from './dto/safe-settings.dto';

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
  @ApiOperation({ summary: 'Obter configurações seguras' })
  @ApiOkResponse({
    description: 'Retorna configurações seguras (sem secrets).',
    type: SafeSettingsDto,
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
  @ApiOperation({ summary: 'Criar/atualizar configurações (setup e manutenção)' })
  @ApiBody({ type: UpdateSettingsDto })
  @ApiOkResponse({
    description: 'Configurações atualizadas com sucesso.',
    type: SafeSettingsDto,
  })
  @ApiBadRequestResponse({ description: 'Configurações inválidas.' })
  async update(@Body() dto: UpdateSettingsDto) {
    return this.settings.updateSettings(dto);
  }
}
