import { ApiProperty } from '@nestjs/swagger';

export class PortBinding {
  @ApiProperty({
    description: 'IP do host',
    example: '0.0.0.0',
    required: false,
  })
  HostIp?: string;

  @ApiProperty({
    description: 'Porta publicada no host',
    example: '8080',
    required: false,
  })
  HostPort?: string;
}

export class RestartPolicy {
  @ApiProperty({ description: 'Política de restart', example: 'always' })
  Name: string;

  @ApiProperty({
    description: 'Número máximo de tentativas',
    example: 5,
    required: false,
  })
  MaximumRetryCount?: number;
}

export class NetworkAttachment {
  @ApiProperty({ description: 'Nome da rede', example: 'bridge' })
  name: string;

  @ApiProperty({
    description: 'Endereço IPv4 fixo (se existir)',
    example: '172.17.0.10',
    required: false,
  })
  ipv4Address?: string;

  @ApiProperty({
    description: 'Endereço IPv6 fixo (se existir)',
    required: false,
  })
  ipv6Address?: string;
}

export class RecreatePlanDto {
  @ApiProperty({ description: 'ID do container atual', example: 'a9d7c7a3a3e6' })
  oldId: string;

  @ApiProperty({ description: 'Nome do container', example: 'nginx' })
  name: string;

  @ApiProperty({
    description: 'Imagem alvo (ex.: nginx:latest)',
    example: 'nginx:latest',
  })
  image: string;

  @ApiProperty({
    description: 'Variáveis de ambiente',
    example: ['ENV=prod'],
  })
  env: string[];

  @ApiProperty({
    description: 'Labels do container',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { 'com.example.vendor': 'ACME' },
  })
  labels: Record<string, string>;

  @ApiProperty({
    description: 'Portas expostas, ex.: { "80/tcp": {} }',
    type: 'object',
    additionalProperties: true,
    example: { '80/tcp': {} },
  })
  exposedPorts: Record<string, {}>;

  @ApiProperty({
    description: 'Mapeamento de portas (bindings)',
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          HostIp: { type: 'string' },
          HostPort: { type: 'string' },
        },
      },
    },
    example: { '80/tcp': [{ HostIp: '0.0.0.0', HostPort: '8080' }] },
  })
  portBindings: Record<string, Array<{ HostIp?: string; HostPort?: string }>>;

  @ApiProperty({
    description:
      'Binds no formato do Docker: ["hostPath:/containerPath:ro", ...]',
    example: ['/data/nginx:/usr/share/nginx/html:ro'],
  })
  binds: string[];

  @ApiProperty({
    description: 'Política de restart',
    type: RestartPolicy,
    required: false,
  })
  restartPolicy?: RestartPolicy;

  @ApiProperty({ description: 'Redes', type: [NetworkAttachment] })
  networks: NetworkAttachment[];
}
