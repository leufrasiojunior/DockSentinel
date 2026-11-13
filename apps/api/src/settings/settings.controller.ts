import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
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
import {
  CreateRegistryCredentialDto,
  SafeRegistryCredentialDto,
  UpdateRegistryCredentialDto,
} from './dto/registry-credential.dto';

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

  @Get('registries')
  @ApiOperation({ summary: 'Listar credenciais de registries configuradas' })
  @ApiOkResponse({
    description: 'Lista de credenciais (sem senha em texto claro).',
    type: [SafeRegistryCredentialDto],
  })
  async listRegistries() {
    return this.settings.listRegistries();
  }

  @Post('registries')
  @ApiOperation({ summary: 'Cadastrar nova credencial de registry' })
  @ApiBody({ type: CreateRegistryCredentialDto })
  @ApiOkResponse({
    description: 'Credencial criada.',
    type: SafeRegistryCredentialDto,
  })
  async createRegistry(@Body() dto: CreateRegistryCredentialDto) {
    return this.settings.createRegistry(dto);
  }

  @Put('registries/:id')
  @ApiOperation({ summary: 'Atualizar credencial de registry' })
  @ApiBody({ type: UpdateRegistryCredentialDto })
  @ApiOkResponse({
    description: 'Credencial atualizada.',
    type: SafeRegistryCredentialDto,
  })
  async updateRegistry(
    @Param('id') id: string,
    @Body() dto: UpdateRegistryCredentialDto,
  ) {
    return this.settings.updateRegistry(id, dto);
  }

  @Delete('registries/:id')
  @ApiOperation({ summary: 'Remover credencial de registry' })
  @ApiOkResponse({
    description: 'Credencial removida.',
    type: OkResponseDto,
  })
  async deleteRegistry(@Param('id') id: string) {
    return this.settings.deleteRegistry(id);
  }

  @Get('version-check')
  @ApiOperation({
    summary: 'Verificar novas versões do DockSentinel e do DockSentinelAgent no GitHub',
  })
  async checkSystemVersions(@Query('refresh') refresh?: string) {
    const forceRefresh = refresh === 'true' || refresh === '1';
    return this.settings.checkSystemVersions(forceRefresh);
  }
}
