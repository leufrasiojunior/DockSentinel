import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContainerUpdateCheckDto {
  @ApiProperty({
    description: 'Nome do container',
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
}
