import { ApiProperty } from '@nestjs/swagger';

export class SafeSettingsDto {
  @ApiProperty({
    description: 'Modo de autenticação',
    enum: ['none', 'password', 'totp', 'both'],
    example: 'none',
  })
  authMode!: 'none' | 'password' | 'totp' | 'both';

  @ApiProperty({
    description: 'Nível de log',
    enum: ['error', 'warn', 'info', 'debug'],
    example: 'info',
  })
  logLevel!: 'error' | 'warn' | 'info' | 'debug';

  @ApiProperty({
    description: 'Indica se há senha cadastrada',
    example: true,
  })
  hasPassword!: boolean;

  @ApiProperty({
    description: 'Indica se o TOTP está configurado',
    example: false,
  })
  hasTotp!: boolean;
}
