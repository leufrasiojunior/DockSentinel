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

  @ApiProperty({
    description: 'Data de criação da configuração inicial (setup)',
    nullable: true,
    example: '2026-02-07T12:00:00.000Z',
  })
  createdAt!: string | null;

  @ApiProperty({
    description: 'Data da última atualização das configurações',
    nullable: true,
    example: '2026-02-07T12:10:00.000Z',
  })
  updatedAt!: string | null;
}
