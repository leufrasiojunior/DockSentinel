import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { UpdateSchedulerDto, updateSchedulerSchema } from './dto/UpdateSchedulerDto.dto';

@ApiTags('updates')
@Controller('updates')
export class UpdatesController {
  constructor(
    private readonly repo: UpdatesRepository,
    private readonly worker: UpdatesWorkerService,
private readonly scheduler: UpdatesSchedulerService,
    private readonly orchestrator: UpdatesOrchestratorService,
  ) {}

  @Post('enqueue')
  @ApiOperation({ summary: 'Enqueue one update job' })
  @ApiResponse({ status: 201 })
  @ApiBody({ type: EnqueueDto })
  async enqueue(@Body(new ZodValidationPipe(enqueueSchema)) body: EnqueueDto) {
    const result = await this.repo.enqueueMany([body]);

    // 🔥 fire-and-forget (NÃO await)
    this.worker.kick().catch((err) => {
      console.error('[UpdatesWorker] kick failed', err);
    });

    return result;
  }

  @Post('batch')
  @ApiOperation({ summary: 'Enqueue multiple update jobs' })
  @ApiResponse({ status: 201 })
  @ApiBody({ type: BatchDto })
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
  @ApiOperation({ summary: 'List update jobs (recent) with optional filters)' })
  @ApiResponse({ status: 200 })
  async listJobs(
    @Query(new ZodValidationPipe(jobsQuerySchema)) query: JobsQuery,
  ) {
    return this.repo.listJobs(query);
  }

  // ✅ Observabilidade (detalhe)
  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get one update job details' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async getJob(@Param('id') id: string) {
    return this.repo.getJobOrThrow(id);
  }

  // (Opcional) útil pra debug manual
  @Post('kick')
  @ApiOperation({ summary: 'Manually kick worker loop (debug)' })
  @ApiResponse({ status: 202 })
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
  @Get("scheduler")
  @ApiOperation({ summary: "Get scheduler config (DB)" })
  async getScheduler() {
    return this.scheduler.getConfig()
  }

  @Put("scheduler")
  @ApiOperation({ summary: "Update scheduler config (DB) and apply immediately" })
  @ApiBody({ type: UpdateSchedulerDto })
  async updateScheduler(
    @Body(new ZodValidationPipe(updateSchedulerSchema)) body: UpdateSchedulerDto,
  ) {
    return this.scheduler.updateConfig(body)
  }

@Post("scan-and-enqueue")
@ApiOperation({
  summary:
    "Scan containers and optionally enqueue update jobs (DB config by default). " +
    "Auto-update is skipped when container has label docksentinel.update=false",
})
async scanAndEnqueue(
  @Body()
  body?: Partial<{
    mode: "scan_only" | "scan_and_update"
    updateLabelKey: string
  }>,
) {
  // ✅ 1) body vazio ou não enviado -> usa DB
  if (!body || Object.keys(body).length === 0) {
    return this.orchestrator.scanAndEnqueueFromDb()
  }

  // ✅ 2) valida o mode se veio (evita "string qualquer" no Postman)
  if (body.mode && body.mode !== "scan_only" && body.mode !== "scan_and_update") {
    // use BadRequestException se quiser status 400 bonitinho
    throw new Error(`Invalid mode: ${String(body.mode)}`)
  }

  // ✅ 3) override manual (útil pra Postman)
  // - mode default: scan_only
  // - updateLabelKey default: docksentinel.update
  return this.orchestrator.scanAndEnqueue({
    mode: body.mode ?? "scan_only",
    updateLabelKey: (body.updateLabelKey?.trim() || "docksentinel.update"),
  })
}








}
