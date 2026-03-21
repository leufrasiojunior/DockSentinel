import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
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
import { UpdatesWorkerService } from './updates.worker.service';
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
import { t } from '../i18n/translate';

@ApiTags('Updates')
@ApiExtraModels(ScanResultOkDto, ScanResultErrorDto)
@Controller('updates')
export class UpdatesController {
  constructor(
    private readonly repo: UpdatesRepository,
    private readonly worker: UpdatesWorkerService,
    private readonly scheduler: UpdatesSchedulerService,
    private readonly orchestrator: UpdatesOrchestratorService,
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
    const result = await this.repo.enqueueMany([body]);

    // 🔥 fire-and-forget (NÃO await)
    this.worker.kick().catch((err) => {
      console.error('[UpdatesWorker] kick failed', err);
    });

    return result;
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
    const result = await this.repo.enqueueMany(body.items ?? []);

    // 🔥 fire-and-forget (NÃO await)
    this.worker.kick().catch((err) => {
      console.error('[UpdatesWorker] kick failed', err);
    });

    return result;
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
    return this.repo.listJobs(query);
  }

  // ✅ Observabilidade (detalhe)
  @Get('jobs/:id')
  @ApiOperation({ summary: 'Obter detalhes de um job' })
  @ApiParam({ name: 'id', description: 'ID do job' })
  @ApiOkResponse({ description: 'Detalhes do job.', type: UpdateJobDto })
  @ApiNotFoundResponse({ description: 'Job não encontrado.' })
  async getJob(@Param('id') id: string) {
    return this.repo.getJobOrThrow(id);
  }

  // (Opcional) útil pra debug manual
  @Post('kick')
  @ApiOperation({ summary: 'Forçar execução do worker (debug)' })
  @ApiAcceptedResponse({
    description: 'Worker acionado.',
    type: OkResponseDto,
  })
  async kick() {
    this.worker.kick().catch((err) => {
      console.error('[UpdatesWorker] kick failed', err);
    });
    return { ok: true };
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
  @ApiOperation({ summary: 'Obter configuração do scheduler (DB)' })
  @ApiOkResponse({
    description: 'Configuração atual.',
    type: SchedulerConfigResponseDto,
  })
  async getScheduler() {
    return this.scheduler.getConfig();
  }

  @Put('scheduler')
  @ApiOperation({
    summary: 'Atualizar configuração do scheduler (DB) e aplicar imediatamente',
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
    return this.scheduler.updateConfig(body);
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
    // ✅ 1) body vazio ou não enviado -> usa DB
    if (!body || Object.keys(body).length === 0) {
      return this.orchestrator.scanAndEnqueueFromDb();
    }

    // ✅ 2) valida o mode se veio (evita "string qualquer" no Postman)
    if (
      body.mode &&
      body.mode !== 'scan_only' &&
      body.mode !== 'scan_and_update'
    ) {
      throw new BadRequestException(
        t('updates.invalidMode', { value: String(body.mode) }),
      );
    }

    // ✅ 3) override manual (útil pra Postman)
    // - mode default: scan_only
    // - updateLabelKey default: docksentinel.update
    return this.orchestrator.scanAndEnqueue({
      mode: body.mode ?? 'scan_only',
      updateLabelKey: body.updateLabelKey?.trim() || 'docksentinel.update',
    });
  }
}
