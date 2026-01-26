import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSettingsDto {
  @ApiProperty({
    description: 'Authentication mode',
    enum: ['none', 'password', 'totp', 'both'],
    required: false,
  })
  @IsEnum(['none', 'password', 'totp', 'both'])
  @IsOptional()
  authMode?: 'none' | 'password' | 'totp' | 'both';

  @ApiProperty({
    description: 'Log level',
    enum: ['error', 'warn', 'info', 'debug'],
    required: false,
  })
  @IsEnum(['error', 'warn', 'info', 'debug'])
  @IsOptional()
  logLevel?: 'error' | 'warn' | 'info' | 'debug';

  @ApiProperty({
    description: 'Admin password (min 8 characters)',
    required: false,
  })
  @IsString()
  @MinLength(8)
  @IsOptional()
  adminPassword?: string;

  @ApiProperty({
    description: 'TOTP secret (min 16 characters)',
    required: false,
  })
  @IsString()
  @MinLength(16)
  @IsOptional()
  totpSecret?: string;
}
