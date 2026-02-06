import { ApiProperty } from '@nestjs/swagger';

export class OkResponseDto {
  @ApiProperty({
    description: 'Operação executada com sucesso',
    example: true,
  })
  ok!: boolean;
}
