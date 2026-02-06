import { ApiProperty } from '@nestjs/swagger';

export class HealthStatusDto {
  @ApiProperty({
    description: 'Indica se a API está saudável',
    example: true,
  })
  ok!: boolean;
}
