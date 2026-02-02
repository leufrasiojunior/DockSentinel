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
  JobsQueryDto,
  jobsQuerySchema, type JobsQuery 
} from './dto/updates.dto';

@ApiTags('updates')
@Controller('updates')
export class UpdatesController {
  constructor(
    private readonly repo: UpdatesRepository,
    private readonly worker: UpdatesWorkerService,
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
}
