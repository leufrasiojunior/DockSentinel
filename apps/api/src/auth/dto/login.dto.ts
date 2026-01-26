import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Password for login. Required if auth mode is PASSWORD.',
    required: false,
  })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({
    description: 'Time-based one-time password. Required if auth mode is TOTP.',
    required: false,
  })
  @IsString()
  @IsOptional()
  totp?: string;
}
