import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobDto {
  @ApiProperty({ description: 'ID do job', example: 'ckw1k8m2b0001p6z0abcd1234' })
  id!: string;

  @ApiProperty({
    description: 'Status do job',
    enum: ['queued', 'running', 'success', 'failed'],
    example: 'queued',
  })
  status!: 'queued' | 'running' | 'success' | 'failed';

  @ApiProperty({
    description: 'Container alvo',
    example: 'nginx',
  })
  container!: string;

  @ApiPropertyOptional({
    description: 'Imagem alvo (se definida)',
    example: 'nginx:latest',
  })
  image?: string | null;

  @ApiProperty({
    description: 'Força atualização',
    example: false,
  })
  force!: boolean;

  @ApiProperty({
    description: 'Faz pull antes de atualizar',
    example: true,
  })
  pull!: boolean;

  @ApiProperty({
    description: 'Data de criação (ISO)',
    example: '2026-02-04T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Início do processamento (ISO)',
    example: '2026-02-04T12:01:00.000Z',
  })
  startedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Fim do processamento (ISO)',
    example: '2026-02-04T12:02:30.000Z',
  })
  finishedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Resultado serializado (JSON em string)',
    example: '{"status":"success"}',
  })
  resultJson?: string | null;

  @ApiPropertyOptional({
    description: 'Mensagem de erro (se falhou)',
    example: 'pull failed',
  })
  error?: string | null;

  @ApiPropertyOptional({
    description: 'Data de lock (ISO)',
    example: '2026-02-04T12:01:00.000Z',
  })
  lockedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Identificador do worker que fez o lock',
    example: 'worker-1234',
  })
  lockedBy?: string | null;
}
