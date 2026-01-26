import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

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
  @ApiOperation({ summary: 'Check API health' })
  @ApiResponse({ status: 200, description: 'API is healthy.' })
  getHealth() {
    return { ok: true };
  }
}
