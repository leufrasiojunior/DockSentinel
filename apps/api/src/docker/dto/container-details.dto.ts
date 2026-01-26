import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO “enxuto” com o essencial pra UI e pro future update engine.
 * (A gente NÃO devolve o inspect bruto inteiro porque ele é gigante.)
 */

export class ContainerPortBinding {
  @ApiProperty({ description: 'Container port', example: '80/tcp' })
  containerPort: string;

  @ApiProperty({
    description: 'Host IP address',
    example: '0.0.0.0',
    required: false,
  })
  hostIp?: string;

  @ApiProperty({
    description: 'Host port',
    example: '8080',
    required: false,
  })
  hostPort?: string;
}

export class ContainerMount {
  @ApiProperty({
    description: 'Mount type',
    example: 'bind',
  })
  type: string;

  @ApiProperty({
    description: 'Mount source path on host or volume name',
    example: '/path/on/host',
    required: false,
  })
  source?: string;

  @ApiProperty({
    description: 'Mount target path in container',
    example: '/usr/share/nginx/html',
  })
  target: string;

  @ApiProperty({
    description: 'Whether the mount is read-only',
    example: true,
  })
  readOnly: boolean;
}

export class ContainerNetwork {
  @ApiProperty({ description: 'Network name', example: 'bridge' })
  name: string;

  @ApiProperty({
    description: 'IPv4 address',
    example: '172.17.0.2',
    required: false,
  })
  ipv4Address?: string;

  @ApiProperty({
    description: 'IPv6 address',
    required: false,
  })
  ipv6Address?: string;

  @ApiProperty({
    description: 'MAC address',
    required: false,
  })
  macAddress?: string;
}

export class RestartPolicyDto {
  @ApiProperty({ example: 'always' })
  name: string;

  @ApiProperty({ example: 5, required: false })
  maximumRetryCount?: number;
}

export class ContainerDetailsDto {
  @ApiProperty({
    description: 'Container ID',
    example: 'a9d7c7a3a3e6',
  })
  id: string;

  @ApiProperty({ description: 'Container name', example: '/nginx' })
  name: string;

  @ApiProperty({
    description: 'Container image',
    example: 'nginx:latest',
  })
  image: string;

  @ApiProperty({ description: 'Container state', example: 'running' })
  state: string;

  @ApiProperty({ description: 'Container status', example: 'Up 2 hours' })
  status: string;

  @ApiProperty({
    description: 'Environment variables',
    example: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
  })
  env: string[];

  @ApiProperty({
    description: 'Labels',
    example: { 'com.example.vendor': 'ACME' },
  })
  labels: Record<string, string>;

  @ApiProperty({
    description: 'Restart policy',
    required: false,
    type: RestartPolicyDto,
  })
  restartPolicy?: RestartPolicyDto;

  @ApiProperty({
    description: 'Port bindings',
    type: [ContainerPortBinding],
  })
  ports: ContainerPortBinding[];

  @ApiProperty({
    description: 'Mounts',
    type: [ContainerMount],
  })
  mounts: ContainerMount[];

  @ApiProperty({
    description: 'Networks',
    type: [ContainerNetwork],
  })
  networks: ContainerNetwork[];
}
