import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SetupDto } from './setup.dto';
import { SetupService } from './setup.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

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
  @ApiOperation({ summary: 'Run initial setup' })
  @ApiResponse({ status: 201, description: 'Setup completed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid setup data.' })
  @ApiResponse({ status: 409, description: 'Setup already completed.' })
  async run(@Body() body: SetupDto) {
    return this.setup.runSetup(body);
  }
}
