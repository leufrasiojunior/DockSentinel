import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SetupDto } from './setup.dto';
import { SetupService } from './setup.service';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SafeSettingsDto } from '../settings/dto/safe-settings.dto';

/**
 * SetupController:
 * - rota pública para primeira configuração
 * - depois do setup, retorna 409 (via service)
 */
@ApiTags('Setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Executar setup inicial' })
  @ApiBody({ type: SetupDto })
  @ApiCreatedResponse({
    description: 'Setup concluído com sucesso.',
    type: SafeSettingsDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de setup inválidos.' })
  @ApiConflictResponse({ description: 'Setup já foi concluído.' })
  async run(@Body() body: SetupDto) {
    return this.setup.runSetup(body);
  }
}
