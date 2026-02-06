import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { ContainerUpdateCheckDto } from './update-check.dto';

export class PullInfoDto {
  @ApiPropertyOptional({
    description: 'Indica que o pull foi ignorado',
    example: true,
  })
  skipped?: boolean;

  @ApiPropertyOptional({
    description: 'Imagem alvo usada no pull',
    example: 'nginx:latest',
  })
  imageRef?: string;

  @ApiPropertyOptional({
    description: 'ID da imagem baixada',
    example: 'sha256:2fef9f8a9c1c...',
  })
  pulledImageId?: string;
}

export class ContainerUpdateInfoDto {
  @ApiProperty({
    description: 'ID do container',
    example: 'a9d7c7a3a3e6',
  })
  containerId!: string;

  @ApiProperty({
    description: 'Imagem (tag)',
    example: 'nginx:latest',
  })
  imageRef!: string;

  @ApiProperty({
    description: 'ID local da imagem',
    example: 'sha256:2fef9f8a9c1c...',
  })
  localImageId!: string;
}

export class ContainerUpdateResultSuccessDto {
  @ApiProperty({
    description: 'Status do resultado',
    enum: ['success'],
    example: 'success',
  })
  status!: 'success';

  @ApiProperty({ description: 'Informações do pull', type: PullInfoDto })
  pull!: PullInfoDto;

  @ApiProperty({ description: 'Container antigo', type: ContainerUpdateInfoDto })
  old!: ContainerUpdateInfoDto;

  @ApiProperty({ description: 'Container novo', type: ContainerUpdateInfoDto })
  new!: ContainerUpdateInfoDto;

  @ApiProperty({
    description: 'Resultado do healthcheck',
    enum: ['no-healthcheck', 'healthy', 'unhealthy', 'timeout'],
    example: 'healthy',
  })
  health!: 'no-healthcheck' | 'healthy' | 'unhealthy' | 'timeout';

  @ApiProperty({
    description: 'Indica se o ID da imagem mudou após recriar',
    example: true,
  })
  didChangeImageId!: boolean;
}

export class ContainerUpdateResultRolledBackDto {
  @ApiProperty({
    description: 'Status do resultado',
    enum: ['rolled_back'],
    example: 'rolled_back',
  })
  status!: 'rolled_back';

  @ApiProperty({ description: 'Informações do pull', type: PullInfoDto })
  pull!: PullInfoDto;

  @ApiProperty({ description: 'Container antigo', type: ContainerUpdateInfoDto })
  old!: ContainerUpdateInfoDto;

  @ApiProperty({
    description: 'Imagem tentada durante o update',
    example: 'nginx:latest',
  })
  attemptedImage!: string;

  @ApiProperty({
    description: 'Mensagem de erro que causou o rollback',
    example: 'Health-check failed: timeout',
  })
  error!: string;
}

export class ContainerRecreateNoopDto {
  @ApiProperty({
    description: 'Status do resultado',
    enum: ['noop'],
    example: 'noop',
  })
  status!: 'noop';

  @ApiProperty({
    description: 'Motivo do noop',
    example: 'already_up_to_date',
  })
  reason!: string;

  @ApiProperty({
    description: 'Nome do container',
    example: 'nginx',
  })
  container!: string;

  @ApiProperty({
    description: 'Imagem (tag)',
    example: 'nginx:latest',
  })
  imageRef!: string;

  @ApiPropertyOptional({
    description: 'Digest remoto (quando disponível)',
    example: 'sha256:9f2c1b7c...',
  })
  remoteDigest?: string;

  @ApiPropertyOptional({
    description: 'RepoDigests locais',
    example: ['nginx@sha256:9f2c1b7c...'],
  })
  repoDigests?: string[];

  @ApiProperty({
    description: 'Indica se há atualização',
    example: false,
  })
  hasUpdate!: boolean;
}

export class UpdateContainerNoopDto {
  @ApiProperty({
    description: 'Status do resultado',
    enum: ['noop'],
    example: 'noop',
  })
  status!: 'noop';

  @ApiProperty({
    description: 'Motivo do noop',
    example: 'already_up_to_date',
  })
  reason!: string;

  @ApiProperty({
    description: 'Nome do container',
    example: 'nginx',
  })
  container!: string;

  @ApiProperty({ description: 'Resultado da checagem', type: ContainerUpdateCheckDto })
  check!: ContainerUpdateCheckDto;
}

export class UpdateContainerResultDto {
  @ApiProperty({
    description: 'Status final (success ou rolled_back)',
    enum: ['success', 'rolled_back'],
    example: 'success',
  })
  status!: 'success' | 'rolled_back';

  @ApiProperty({
    description: 'Nome do container',
    example: 'nginx',
  })
  container!: string;

  @ApiProperty({
    description: 'Imagem alvo usada no update',
    example: 'nginx:latest',
  })
  targetImage!: string;

  @ApiProperty({
    description: 'Checagem antes do update',
    type: ContainerUpdateCheckDto,
  })
  checkBefore!: ContainerUpdateCheckDto;

  @ApiProperty({
    description: 'Resultado do update',
    oneOf: [
      { $ref: getSchemaPath(ContainerUpdateResultSuccessDto) },
      { $ref: getSchemaPath(ContainerUpdateResultRolledBackDto) },
    ],
  })
  result!: ContainerUpdateResultSuccessDto | ContainerUpdateResultRolledBackDto;

  @ApiPropertyOptional({
    description: 'Checagem após o update (pode ser null)',
    type: ContainerUpdateCheckDto,
  })
  checkAfter?: ContainerUpdateCheckDto | null;
}
