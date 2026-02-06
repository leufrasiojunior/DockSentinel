import { ApiProperty } from '@nestjs/swagger';

export class ContainerSummaryDto {
  @ApiProperty({
    description: 'ID do container (curto)',
    example: 'a9d7c7a3a3e6',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do container (sem /)',
    example: 'nginx',
  })
  name: string;

  @ApiProperty({
    description: 'Imagem do container (tag)',
    example: 'nginx:latest',
  })
  image: string;

  @ApiProperty({
    description: 'Estado atual',
    example: 'running',
  })
  state: string;

  @ApiProperty({
    description: 'Status (texto do Docker)',
    example: 'Up 2 hours',
  })
  status: string;

  @ApiProperty({
    description: 'Labels do container',
    example: { 'com.example.vendor': 'ACME' },
  })
  labels: Record<string, string>;
}
