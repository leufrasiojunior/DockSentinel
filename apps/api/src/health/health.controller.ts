import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthStatusDto } from './health.dto';

/**
 * Health endpoint:
 * - deve ser público (para docker/monitoramento)
 * - útil para e2e e para o futuro compose/ingress
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Verificar saúde da API' })
  @ApiOkResponse({
    description: 'API saudável.',
    type: HealthStatusDto,
  })
  getHealth() {
    return { ok: true };
  }
}
