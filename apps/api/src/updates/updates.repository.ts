import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JobsQuery } from './dto/updates.dto';

type EnqueueInput = {
  container: string;
  image?: string | null;
  force?: boolean;
  pull?: boolean;
};

@Injectable()
export class UpdatesRepository {
  constructor(private readonly prisma: PrismaService) {}

    async listJobs(query: JobsQuery) {
    const where: any = {}

    if (query.container) where.container = query.container
    if (query.status) where.status = query.status

    const [items, total] = await Promise.all([
      this.prisma.client.updateJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.take ?? 50,
        skip: query.skip ?? 0,
      }),
      this.prisma.client.updateJob.count({ where }),
    ])

    return { total, items }
  }

  async getJobOrThrow(id: string) {
    const job = await this.prisma.client.updateJob.findUnique({ where: { id } })
    if (!job) throw new NotFoundException(`Job not found: ${id}`)
    return job
  }

  create(data: {
    container: string;
    image?: string;
    force?: boolean;
    pull?: boolean;
  }) {
    return this.prisma.client.updateJob.create({
      data: {
        status: 'queued',
        container: data.container,
        image: data.image,
        force: data.force ?? false,
        pull: data.pull ?? true,
      },
    });
  }

  findById(id: string) {
    return this.prisma.client.updateJob.findUnique({ where: { id } });
  }

  list(limit = 30) {
    return this.prisma.client.updateJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
  // Se um job ficou "running" para sempre (crash), volta para queued
  async resetStaleRunning(staleMs = 10 * 60 * 1000) {
    const limit = new Date(Date.now() - staleMs);

    await this.prisma.client.updateJob.updateMany({
      where: {
        status: 'running',
        lockedAt: { lt: limit },
      },
      data: {
        status: 'queued',
        lockedAt: null,
        lockedBy: null,
        startedAt: null,
        error: 'reset_stale_running',
      },
    });
  }

  /**
   * Claim do próximo job:
   * - acha um queued
   * - tenta marcar como running com condição (status ainda queued)
   * - se alguém pegou antes, tenta de novo
   */
  async claimNextQueued(maxTries = 5) {
    for (let i = 0; i < maxTries; i++) {
      const candidate = await this.prisma.client.updateJob.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' },
      });

      if (!candidate) return null;

      const now = new Date();
      const lockBy = process.env.INSTANCE_ID ?? `worker-${process.pid}`;

      const locked = await this.prisma.client.updateJob.updateMany({
        where: {
          id: candidate.id,
          status: 'queued',
          lockedAt: null,
        },
        data: {
          status: 'running',
          lockedAt: now,
          lockedBy: lockBy,
          startedAt: now,
        },
      });

      if (locked.count === 1) {
        return this.prisma.client.updateJob.findUnique({
          where: { id: candidate.id },
        });
      }

      // alguém pegou antes -> tenta de novo
    }

    // após várias tentativas, não bloqueia o loop geral
    return null;
  }

  async markSuccess(id: string, result: any) {
    await this.prisma.client.updateJob.update({
      where: { id },
      data: {
        status: 'success',
        finishedAt: new Date(),
        resultJson: JSON.stringify(result),
        error: null,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async markFailed(id: string, message: string) {
    await this.prisma.client.updateJob.update({
      where: { id },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        error: message,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  /**
   * Batch enqueue com idempotência:
   * - se já existe job queued/running para o container, pula
   */
  async enqueueMany(items: EnqueueInput[]) {
    const queued: any[] = [];
    const skipped: any[] = [];

    for (const it of items) {
      const exists = await this.prisma.client.updateJob.findFirst({
        where: {
          container: it.container,
          status: { in: ['queued', 'running'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (exists) {
        skipped.push({ container: it.container, reason: 'already_queued' });
        continue;
      }

      const job = await this.prisma.client.updateJob.create({
        data: {
          container: it.container,
          image: it.image ?? null,
          force: Boolean(it.force),
          pull: it.pull ?? true,
          status: 'queued',
        },
      });

      queued.push({ container: it.container, jobId: job.id });
    }

    return { queued, skipped };
  }
}
