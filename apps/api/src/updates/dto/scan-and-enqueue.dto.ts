import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { EnqueueManyResponseDto } from './updates-responses.dto';

export class ScanResultOkDto {
  @ApiProperty({ description: 'Nome do container', example: 'nginx' })
  name!: string;

  @ApiProperty({
    description: 'Nome do container (mesmo valor de name)',
    example: 'nginx',
  })
  container!: string;

  @ApiProperty({
    description: 'Imagem do container (tag)',
    example: 'nginx:latest',
  })
  imageRef!: string;

  @ApiProperty({
    description: 'ID da imagem local usada pelo container',
    example: 'sha256:2fef9f8a9c1c...',
  })
  localImageId!: string;

  @ApiProperty({
    description: 'Indica se foi possível consultar o digest remoto',
    example: true,
  })
  canCheckRemote!: boolean;

  @ApiProperty({
    description: 'Indica se foi possível consultar os digests locais',
    example: true,
  })
  canCheckLocal!: boolean;

  @ApiProperty({
    description: 'Indica se há atualização disponível',
    example: false,
  })
  hasUpdate!: boolean;

  @ApiProperty({
    description: 'Motivo/resumo do resultado da checagem',
    enum: [
      'registry_auth_required',
      'remote_digest_error',
      'remote_digest_not_found',
      'local_image_missing',
      'local_digest_error',
      'local_repo_digests_empty',
      'ok',
    ],
    example: 'ok',
  })
  reason!:
    | 'registry_auth_required'
    | 'remote_digest_error'
    | 'remote_digest_not_found'
    | 'local_image_missing'
    | 'local_digest_error'
    | 'local_repo_digests_empty'
    | 'ok';

  @ApiPropertyOptional({
    description: 'Digest remoto (quando disponível)',
    example: 'sha256:9f2c1b7c...',
  })
  remoteDigest?: string;

  @ApiPropertyOptional({
    description: 'RepoDigests locais (quando disponíveis)',
    example: ['nginx@sha256:9f2c1b7c...'],
  })
  repoDigests?: string[];

  @ApiPropertyOptional({
    description: 'Mensagem de erro, se houver',
    example: 'unauthorized: authentication required',
  })
  error?: string;

  @ApiProperty({
    description: 'Indica se o update automático está desabilitado por label',
    example: false,
  })
  autoUpdateDisabled!: boolean;

  @ApiProperty({
    description: 'Indica se o update automático é permitido',
    example: true,
  })
  allowAutoUpdate!: boolean;
}

export class ScanResultErrorDto {
  @ApiProperty({ description: 'Nome do container', example: 'nginx' })
  name!: string;

  @ApiProperty({
    description: 'Mensagem de erro ao checar o container',
    example: 'Docker not reachable',
  })
  error!: string;

  @ApiProperty({
    description: 'Indica se o update automático está desabilitado por label',
    example: false,
  })
  autoUpdateDisabled!: boolean;

  @ApiProperty({
    description: 'Indica se o update automático é permitido',
    example: true,
  })
  allowAutoUpdate!: boolean;
}

export class ScanAndEnqueueRequestDto {
  @ApiPropertyOptional({
    description: 'Modo de execução',
    enum: ['scan_only', 'scan_and_update'],
    example: 'scan_only',
  })
  mode?: 'scan_only' | 'scan_and_update';

  @ApiPropertyOptional({
    description: 'Label usada para permitir update automático',
    example: 'docksentinel.update',
  })
  updateLabelKey?: string;
}

export class ScanAndEnqueueResultDto {
  @ApiProperty({
    description: 'Quantidade de containers analisados',
    example: 3,
  })
  scanned!: number;

  @ApiProperty({
    description: 'Modo de execução',
    enum: ['scan_only', 'scan_and_update'],
    example: 'scan_only',
  })
  mode!: 'scan_only' | 'scan_and_update';

  @ApiPropertyOptional({
    description: 'Resultado do enqueue (null quando scan_only)',
    type: EnqueueManyResponseDto,
    nullable: true,
  })
  queued?: EnqueueManyResponseDto | null;

  @ApiProperty({
    description: 'Resultados por container',
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(ScanResultOkDto) },
        { $ref: getSchemaPath(ScanResultErrorDto) },
      ],
    },
  })
  results!: Array<ScanResultOkDto | ScanResultErrorDto>;
}
