import { ApiProperty } from '@nestjs/swagger';

export class PortBinding {
  @ApiProperty({ required: false })
  HostIp?: string;

  @ApiProperty({ required: false })
  HostPort?: string;
}

export class RestartPolicy {
  @ApiProperty()
  Name: string;

  @ApiProperty({ required: false })
  MaximumRetryCount?: number;
}

export class NetworkAttachment {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  ipv4Address?: string;

  @ApiProperty({ required: false })
  ipv6Address?: string;
}

export class RecreatePlanDto {
  @ApiProperty()
  oldId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Target image (e.g., nginx:latest)' })
  image: string;

  @ApiProperty()
  env: string[];

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  labels: Record<string, string>;

  @ApiProperty({
    description: 'Exposed ports, e.g., { "80/tcp": {} }',
    type: 'object',
    additionalProperties: true,
  })
  exposedPorts: Record<string, {}>;

  @ApiProperty({
    description: 'Port bindings',
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
  })
  portBindings: Record<string, Array<{ HostIp?: string; HostPort?: string }>>;

  @ApiProperty({
    description: 'Binds in Docker format: ["hostPath:/containerPath:ro", ...]',
  })
  binds: string[];

  @ApiProperty({ type: RestartPolicy, required: false })
  restartPolicy?: RestartPolicy;

  @ApiProperty({ type: [NetworkAttachment] })
  networks: NetworkAttachment[];
}
