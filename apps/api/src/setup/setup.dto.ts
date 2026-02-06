import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO (Data Transfer Object)
 * - define o formato do body aceito em /setup
 * - class-validator valida os campos (docs Nest: ValidationPipe)
 */
export class SetupDto {
  @ApiProperty({
    description: 'Modo de autenticação',
    enum: ['none', 'password', 'totp', 'both'],
    example: 'password',
  })
  @IsIn(['none', 'password', 'totp', 'both'])
  authMode!: 'none' | 'password' | 'totp' | 'both';

  @ApiProperty({
    description: 'Nível de log',
    enum: ['error', 'warn', 'info', 'debug'],
    required: false,
    example: 'info',
  })
  @IsOptional()
  @IsIn(['error', 'warn', 'info', 'debug'])
  logLevel?: 'error' | 'warn' | 'info' | 'debug';

  // usado quando authMode = password | both
  @ApiProperty({
    description: 'Senha do admin (mínimo 8 caracteres)',
    required: false,
    example: 'MinhaSenha123!',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  adminPassword?: string;

  // usado quando authMode = totp | both
  @ApiProperty({
    description: 'Secret TOTP (mínimo 16 caracteres)',
    required: false,
    example: 'JBSWY3DPEHPK3PXP',
  })
  @IsOptional()
  @IsString()
  @MinLength(16)
  totpSecret?: string;
}
