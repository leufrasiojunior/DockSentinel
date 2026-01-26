import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RecreateDto {
  @ApiProperty({
    description: 'The new image to use for recreating the container.',
    example: 'nginx:latest',
  })
  @IsString()
  image: string;
}
