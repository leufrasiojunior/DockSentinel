import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO (Data Transfer Object)
 * - define o formato do body aceito em /setup
 * - class-validator valida os campos (docs Nest: ValidationPipe)
 */
export class SetupDto {
  @ApiProperty({
    description: 'Authentication mode',
    enum: ['none', 'password', 'totp', 'both'],
  })
  @IsIn(['none', 'password', 'totp', 'both'])
  authMode!: 'none' | 'password' | 'totp' | 'both';

  @ApiProperty({
    description: 'Log level',
    enum: ['error', 'warn', 'info', 'debug'],
    required: false,
  })
  @IsOptional()
  @IsIn(['error', 'warn', 'info', 'debug'])
  logLevel?: 'error' | 'warn' | 'info' | 'debug';

  // usado quando authMode = password | both
  @ApiProperty({
    description: 'Admin password (min 8 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  adminPassword?: string;

  // usado quando authMode = totp | both
  @ApiProperty({
    description: 'TOTP secret (min 16 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(16)
  totpSecret?: string;
}
