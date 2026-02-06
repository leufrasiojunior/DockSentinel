import { ApiProperty } from '@nestjs/swagger';
import { UpdateJobDto } from './update-job.dto';

export class EnqueueQueuedItemDto {
  @ApiProperty({ description: 'Container enfileirado', example: 'nginx' })
  container!: string;

  @ApiProperty({
    description: 'ID do job criado',
    example: 'ckw1k8m2b0001p6z0abcd1234',
  })
  jobId!: string;
}

export class EnqueueSkippedItemDto {
  @ApiProperty({ description: 'Container ignorado', example: 'nginx' })
  container!: string;

  @ApiProperty({
    description: 'Motivo do skip',
    enum: ['already_queued'],
    example: 'already_queued',
  })
  reason!: 'already_queued';
}

export class EnqueueManyResponseDto {
  @ApiProperty({ description: 'Itens enfileirados', type: [EnqueueQueuedItemDto] })
  queued!: EnqueueQueuedItemDto[];

  @ApiProperty({
    description: 'Itens ignorados por já estarem na fila',
    type: [EnqueueSkippedItemDto],
  })
  skipped!: EnqueueSkippedItemDto[];
}

export class UpdateJobsListDto {
  @ApiProperty({ description: 'Total de itens encontrados', example: 2 })
  total!: number;

  @ApiProperty({ description: 'Lista de jobs', type: [UpdateJobDto] })
  items!: UpdateJobDto[];
}
