import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO “enxuto” com o essencial pra UI e pro future update engine.
 * (A gente NÃO devolve o inspect bruto inteiro porque ele é gigante.)
 */

export class ContainerPortBinding {
  @ApiProperty({ description: 'Porta exposta no container', example: '80/tcp' })
  containerPort: string;

  @ApiProperty({
    description: 'IP do host',
    example: '0.0.0.0',
    required: false,
  })
  hostIp?: string;

  @ApiProperty({
    description: 'Porta publicada no host',
    example: '8080',
    required: false,
  })
  hostPort?: string;
}

export class ContainerMount {
  @ApiProperty({
    description: 'Tipo de mount (bind/volume/tmpfs)',
    example: 'bind',
  })
  type: string;

  @ApiProperty({
    description: 'Origem no host ou nome do volume',
    example: '/path/on/host',
    required: false,
  })
  source?: string;

  @ApiProperty({
    description: 'Destino no container',
    example: '/usr/share/nginx/html',
  })
  target: string;

  @ApiProperty({
    description: 'Indica se o mount é somente leitura',
    example: true,
  })
  readOnly: boolean;
}

export class ContainerNetwork {
  @ApiProperty({ description: 'Nome da rede', example: 'bridge' })
  name: string;

  @ApiProperty({
    description: 'Endereço IPv4',
    example: '172.17.0.2',
    required: false,
  })
  ipv4Address?: string;

  @ApiProperty({
    description: 'Endereço IPv6',
    required: false,
  })
  ipv6Address?: string;

  @ApiProperty({
    description: 'Endereço MAC',
    required: false,
  })
  macAddress?: string;
}

export class RestartPolicyDto {
  @ApiProperty({ description: 'Política de restart', example: 'always' })
  name: string;

  @ApiProperty({
    description: 'Número máximo de tentativas',
    example: 5,
    required: false,
  })
  maximumRetryCount?: number;
}

export class ContainerDetailsDto {
  @ApiProperty({
    description: 'ID do container',
    example: 'a9d7c7a3a3e6',
  })
  id: string;

  @ApiProperty({ description: 'Nome do container', example: '/nginx' })
  name: string;

  @ApiProperty({
    description: 'Imagem do container (tag)',
    example: 'nginx:latest',
  })
  image: string;

  @ApiProperty({ description: 'Estado do container', example: 'running' })
  state: string;

  @ApiProperty({ description: 'Status (texto do Docker)', example: 'Up 2 hours' })
  status: string;

  @ApiProperty({
    description: 'Variáveis de ambiente',
    example: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
  })
  env: string[];

  @ApiProperty({
    description: 'Labels',
    example: { 'com.example.vendor': 'ACME' },
  })
  labels: Record<string, string>;

  @ApiProperty({
    description: 'Política de restart',
    required: false,
    type: RestartPolicyDto,
  })
  restartPolicy?: RestartPolicyDto;

  @ApiProperty({
    description: 'Mapeamento de portas',
    type: [ContainerPortBinding],
  })
  ports: ContainerPortBinding[];

  @ApiProperty({
    description: 'Mounts (volumes/binds)',
    type: [ContainerMount],
  })
  mounts: ContainerMount[];

  @ApiProperty({
    description: 'Redes',
    type: [ContainerNetwork],
  })
  networks: ContainerNetwork[];
}
