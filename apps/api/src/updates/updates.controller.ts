import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UpdatesRepository } from './updates.repository';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

import {
  BatchDto,
  batchSchema,
  EnqueueDto,
  enqueueSchema,
  jobsQuerySchema,
  type JobsQuery,
} from './dto/updates.dto';
import { UpdatesSchedulerService } from './updates.scheduler.service';
import { UpdatesOrchestratorService } from './updates.orchestrator.service';
import { SchedulerConfigDto, schedulerPatchSchema } from './dto/updates-scheduler.dto';
import {
  EnqueueManyResponseDto,
  UpdateJobsListDto,
} from './dto/updates-responses.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import {
  ScanAndEnqueueRequestDto,
  ScanAndEnqueueResultDto,
  ScanResultErrorDto,
  ScanResultOkDto,
} from './dto/scan-and-enqueue.dto';
import { SchedulerConfigResponseDto } from './dto/scheduler-status.dto';
import { OkResponseDto } from '../common/dto/ok-response.dto';
import {
  LOCAL_ENVIRONMENT_ID,
} from '../environments/environment.constants';
import { UpdatesRequestService } from './updates-request.service';

@ApiTags('Updates')
@ApiExtraModels(ScanResultOkDto, ScanResultErrorDto)
@Controller('updates')
export class UpdatesController {
  constructor(
    private readonly updates: UpdatesRequestService,
    private readonly scheduler: UpdatesSchedulerService,
  ) {}

  @Post('enqueue')
  @ApiOperation({ summary: 'Enfileirar um job de update' })
  @ApiBody({ type: EnqueueDto })
  @ApiCreatedResponse({
    description: 'Job enfileirado com sucesso.',
    type: EnqueueManyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async enqueue(@Body(new ZodValidationPipe(enqueueSchema)) body: EnqueueDto) {
    return this.updates.enqueue(LOCAL_ENVIRONMENT_ID, body);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Enfileirar múltiplos jobs de update' })
  @ApiBody({ type: BatchDto })
  @ApiCreatedResponse({
    description: 'Jobs enfileirados com sucesso.',
    type: EnqueueManyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async batch(@Body(new ZodValidationPipe(batchSchema)) body: BatchDto) {
    return this.updates.batch(LOCAL_ENVIRONMENT_ID, body);
  }

  // ✅ Observabilidade (lista)
  @Get('jobs')
  @ApiOperation({ summary: 'Listar jobs de update' })
  @ApiQuery({ name: 'container', required: false, description: 'Filtra por container' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtra por status',
    enum: ['queued', 'running', 'success', 'failed'],
  })
  @ApiQuery({ name: 'take', required: false, description: 'Quantidade máxima' })
  @ApiQuery({ name: 'skip', required: false, description: 'Offset de paginação' })
  @ApiOkResponse({ description: 'Lista de jobs.', type: UpdateJobsListDto })
  async listJobs(
    @Query(new ZodValidationPipe(jobsQuerySchema)) query: JobsQuery,
  ) {
    return this.updates.listJobs(LOCAL_ENVIRONMENT_ID, query);
  }

  // ✅ Observabilidade (detalhe)
  @Get('jobs/:id')
  @ApiOperation({ summary: 'Obter detalhes de um job' })
  @ApiParam({ name: 'id', description: 'ID do job' })
  @ApiOkResponse({ description: 'Detalhes do job.', type: UpdateJobDto })
  @ApiNotFoundResponse({ description: 'Job não encontrado.' })
  async getJob(@Param('id') id: string) {
    return this.updates.getJob(LOCAL_ENVIRONMENT_ID, id);
  }

  // (Opcional) útil pra debug manual
  @Post('kick')
  @ApiOperation({ summary: 'Forçar execução do worker (debug)' })
  @ApiAcceptedResponse({
    description: 'Worker acionado.',
    type: OkResponseDto,
  })
  async kick() {
    return this.updates.kick();
  }

  /**
   * POST /updates/scan-and-enqueue
   *
   * - Lista containers do Docker
   * - Para cada container, roda canUpdateContainer(name)
   * - Enfileira SOMENTE os que hasUpdate=true
   * - Dispara worker.kick() sem await (assíncrono)
   */
  @Get('scheduler')
  @ApiOperation({
    summary: 'Deprecated: use GET /updates/scheduler/config',
    deprecated: true,
  })
  @ApiOkResponse({
    description: 'Configuração atual.',
    type: SchedulerConfigResponseDto,
  })
  async getScheduler() {
    return this.scheduler.getConfig();
  }

  @Put('scheduler')
  @ApiOperation({
    summary: 'Deprecated: use PATCH /updates/scheduler/config',
    deprecated: true,
  })
  @ApiBody({ type: SchedulerConfigDto })
  @ApiOkResponse({
    description: 'Configuração atualizada.',
    type: SchedulerConfigResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Configuração inválida.' })
  async updateScheduler(
    @Body(new ZodValidationPipe(schedulerPatchSchema))
    body: SchedulerConfigDto,
  ) {
    return this.scheduler.updateConfig(LOCAL_ENVIRONMENT_ID, body);
  }

  @Post('scan-and-enqueue')
  @ApiOperation({
    summary:
      'Escanear containers e enfileirar updates (opcional). ' +
      'Auto-update é pulado quando o container tem label docksentinel.update=false',
  })
  @ApiBody({ type: ScanAndEnqueueRequestDto })
  @ApiOkResponse({
    description: 'Resultado do scan e enqueue.',
    type: ScanAndEnqueueResultDto,
  })
  @ApiBadRequestResponse({ description: 'Parâmetros inválidos.' })
  async scanAndEnqueue(
    @Body()
    body?: Partial<{
      mode: 'scan_only' | 'scan_and_update';
      updateLabelKey: string;
    }>,
  ) {
    return this.updates.scanAndEnqueue(LOCAL_ENVIRONMENT_ID, body);
  }
}
