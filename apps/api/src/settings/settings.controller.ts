import { Body, Controller, Get, Post, Put } from '@nestjs/common';
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
import { OkResponseDto } from '../common/dto/ok-response.dto';
import { SmtpTestDto } from './dto/smtp-test.dto';

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

  @Post('smtp/test')
  @ApiOperation({ summary: 'Testar envio SMTP com config atual ou override no body' })
  @ApiBody({ type: SmtpTestDto, required: false })
  @ApiOkResponse({
    description: 'SMTP validado com sucesso.',
    type: OkResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Configuração SMTP inválida.' })
  async testSmtp(@Body() dto?: SmtpTestDto) {
    return this.settings.testSmtp(dto);
  }
}
