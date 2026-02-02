import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
import { DockerService } from '../docker/docker.service';
import { DockerUpdateService } from '../docker/docker-update.service';

@ApiTags('updates')
@Controller('updates')
export class UpdatesController {
  constructor(
    private readonly repo: UpdatesRepository,
    private readonly worker: UpdatesWorkerService,
    private readonly dockerService: DockerService,
    private readonly updater: DockerUpdateService,
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
  @Post('scan-and-enqueue')
  @ApiOperation({
    summary: 'Scan containers and enqueue update jobs for those with updates',
  })
  @ApiResponse({
    status: 201,
    description: 'Scan completed and jobs enqueued (if any).',
  })
  async scanAndEnqueue(
    @Body()
    body?: {
      force?: boolean;
      pull?: boolean;
      // opcional: se quiser filtrar por nomes (bom pra testes)
      only?: string[];
    },
  ) {
    const force = body?.force ?? false;
    const pull = body?.pull ?? true;
    const only = body?.only?.length ? new Set(body.only) : null;

    // 1) lista containers
    const containers = await this.dockerService.listContainers();
    // normalize nome (docker normalmente devolve ["\/name"])
    const names = containers
      .map((c: any) => {
        const raw = Array.isArray(c.name) ? c.name[0] : c.name;
        if (!raw) return null;
        return String(raw).replace(/^\//, '');
      })
      .filter(Boolean) as string[];
    const scanned: any[] = [];
    const toEnqueue: {
      container: string;
      image?: string | null;
      force?: boolean;
      pull?: boolean;
    }[] = [];
    const errors: any[] = [];

    // 2) checa update container a container
    for (const name of names) {
      if (only && !only.has(name)) continue;

      try {
        const check = await this.updater.canUpdateContainer(name);

        scanned.push({
          container: name,
          imageRef: check.imageRef,
          canCheckRemote: check.canCheckRemote,
          canCheckLocal: check.canCheckLocal,
          hasUpdate: check.hasUpdate,
          reason: (check as any).reason,
        });

        // Só enfileira se dá pra checar e tem update de verdade
        if (check.canCheckRemote && check.canCheckLocal && check.hasUpdate) {
          toEnqueue.push({
            container: name,
            image: check.imageRef, // ✅ importante: salva a tag atual do container (ex: ghcr.io/...:latest)
            force,
            pull,
          });
        }
      } catch (err: any) {
        errors.push({
          container: name,
          error: err?.message ?? String(err),
        });
      }
    }

    // 3) enqueue (com idempotência)
    const enqueueResult = await this.repo.enqueueMany(toEnqueue);

    // 4) dispara o worker sem travar request
    this.worker.kick().catch((err) => {
      console.error('[UpdatesWorker] kick failed', err);
    });

    return {
      scannedCount: scanned.length,
      candidatesCount: toEnqueue.length,
      queued: enqueueResult.queued,
      skipped: enqueueResult.skipped,
      errors,
      scanned,
    };
  }
}
