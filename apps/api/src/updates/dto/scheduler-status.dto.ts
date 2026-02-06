import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScanAndEnqueueResultDto } from './scan-and-enqueue.dto';

export class SchedulerConfigResponseDto {
  @ApiProperty({ description: 'ID do registro', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Habilita o scheduler', example: true })
  enabled!: boolean;

  @ApiProperty({
    description: 'Expressão cron com 5 campos (min hora dom mês dia-semana)',
    example: '*/5 * * * *',
  })
  cronExpr!: string;

  @ApiProperty({
    description: 'Modo de execução',
    enum: ['scan_only', 'scan_and_update'],
    example: 'scan_only',
  })
  mode!: 'scan_only' | 'scan_and_update';

  @ApiProperty({
    description: 'Escopo de seleção de containers',
    enum: ['all', 'labeled'],
    example: 'all',
  })
  scope!: 'all' | 'labeled';

  @ApiProperty({
    description: 'Label usada para permitir scan quando scope=labeled',
    example: 'docksentinel.scan',
  })
  scanLabelKey!: string;

  @ApiProperty({
    description: 'Label usada para permitir update automático',
    example: 'docksentinel.update',
  })
  updateLabelKey!: string;

  @ApiPropertyOptional({
    description: 'Última execução registrada no DB (ISO)',
    example: '2026-02-04T12:00:00.000Z',
  })
  lastRunAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Indica se há execução em andamento (DB)',
    example: false,
  })
  running?: boolean | null;

  @ApiPropertyOptional({
    description: 'Data de lock (ISO)',
    example: '2026-02-04T12:00:00.000Z',
  })
  lockedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Identificador do worker que fez o lock',
    example: 'worker-1234',
  })
  lockedBy?: string | null;

  @ApiPropertyOptional({
    description: 'Data de criação (ISO)',
    example: '2026-02-01T10:00:00.000Z',
  })
  createdAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Data de atualização (ISO)',
    example: '2026-02-04T12:00:00.000Z',
  })
  updatedAt?: Date | null;
}

export class SchedulerRuntimeDto {
  @ApiProperty({ description: 'Job registrado em memória', example: true })
  hasJob!: boolean;

  @ApiProperty({ description: 'Scheduler habilitado', example: true })
  enabled!: boolean;

  @ApiProperty({ description: 'Indica se está executando agora', example: false })
  ticking!: boolean;

  @ApiPropertyOptional({
    description: 'Próxima execução prevista (ISO)',
    example: '2026-02-04T12:05:00.000Z',
  })
  nextScanAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Último início de execução (ISO)',
    example: '2026-02-04T12:00:00.000Z',
  })
  lastRunAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Último fim de execução (ISO)',
    example: '2026-02-04T12:00:08.000Z',
  })
  lastFinishedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Último erro ocorrido',
    example: null,
  })
  lastError?: string | null;

  @ApiPropertyOptional({
    description: 'Último resultado do scan',
    type: ScanAndEnqueueResultDto,
    nullable: true,
  })
  lastResult?: ScanAndEnqueueResultDto | null;
}

export class SchedulerStatusDto {
  @ApiProperty({ description: 'Configuração atual', type: SchedulerConfigResponseDto })
  config!: SchedulerConfigResponseDto;

  @ApiProperty({ description: 'Status em runtime', type: SchedulerRuntimeDto })
  runtime!: SchedulerRuntimeDto;
}
