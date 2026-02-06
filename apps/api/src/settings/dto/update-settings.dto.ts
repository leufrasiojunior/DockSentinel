import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSettingsDto {
  @ApiProperty({
    description: 'Modo de autenticação',
    enum: ['none', 'password', 'totp', 'both'],
    required: false,
    example: 'both',
  })
  @IsEnum(['none', 'password', 'totp', 'both'])
  @IsOptional()
  authMode?: 'none' | 'password' | 'totp' | 'both';

  @ApiProperty({
    description: 'Nível de log',
    enum: ['error', 'warn', 'info', 'debug'],
    required: false,
    example: 'info',
  })
  @IsEnum(['error', 'warn', 'info', 'debug'])
  @IsOptional()
  logLevel?: 'error' | 'warn' | 'info' | 'debug';

  @ApiProperty({
    description: 'Senha do admin (mínimo 8 caracteres)',
    required: false,
    example: 'MinhaSenha123!',
  })
  @IsString()
  @MinLength(8)
  @IsOptional()
  adminPassword?: string;

  @ApiProperty({
    description: 'Secret TOTP (mínimo 16 caracteres)',
    required: false,
    example: 'JBSWY3DPEHPK3PXP',
  })
  @IsString()
  @MinLength(16)
  @IsOptional()
  totpSecret?: string;
}
