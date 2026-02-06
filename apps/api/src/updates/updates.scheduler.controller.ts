import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'; // ajuste caminho

import { UpdatesSchedulerService } from './updates.scheduler.service';
import { schedulerPatchSchema, UpdateSchedulerConfigPatchDto } from './dto/updates-scheduler.dto';
import {
  SchedulerConfigResponseDto,
  SchedulerStatusDto,
} from './dto/scheduler-status.dto';
import { ScanResultErrorDto, ScanResultOkDto } from './dto/scan-and-enqueue.dto';

@ApiTags('Updates')
@ApiExtraModels(ScanResultOkDto, ScanResultErrorDto)
@Controller('updates/scheduler')
export class UpdatesSchedulerController {
  constructor(private readonly scheduler: UpdatesSchedulerService) {}

  @Get('config')
  @ApiOperation({ summary: 'Obter configuração do scheduler (DB singleton)' })
  @ApiOkResponse({ description: 'Configuração atual.', type: SchedulerConfigResponseDto })
  async getConfig() {
    return this.scheduler.getConfig();
  }

  @Patch('config')
  @ApiOperation({
    summary: 'Atualizar configuração do scheduler (DB) e aplicar imediatamente',
  })
  @ApiBody({ type: UpdateSchedulerConfigPatchDto })
  @ApiOkResponse({ description: 'Configuração atualizada.', type: SchedulerConfigResponseDto })
  async updateConfig(
    @Body(new ZodValidationPipe(schedulerPatchSchema))
    body: UpdateSchedulerConfigPatchDto,
  ) {
    // body já validado pelo ZodValidationPipe
    return this.scheduler.updateConfig(body);
  }

  @Get('scheduler')
  @ApiOperation({ summary: 'Obter configuração + status em runtime (DB)' })
  @ApiOkResponse({ description: 'Status completo do scheduler.', type: SchedulerStatusDto })
  async getScheduler() {
    return this.scheduler.getStatus();
  }
}
