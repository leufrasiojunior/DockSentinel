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
    description: 'Idioma padrão da aplicação para processos sem contexto do navegador',
    enum: ['pt-BR', 'en-US'],
    example: 'pt-BR',
  })
  defaultLocale!: 'pt-BR' | 'en-US';

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

  @ApiProperty({ example: true })
  notificationsInAppEnabled!: boolean;

  @ApiProperty({ example: false })
  notificationsEmailEnabled!: boolean;

  @ApiProperty({ enum: ['all', 'errors_only'], example: 'all' })
  notificationLevel!: 'all' | 'errors_only';

  @ApiProperty({ example: 15 })
  notificationReadRetentionDays!: number;

  @ApiProperty({ example: 60 })
  notificationUnreadRetentionDays!: number;

  @ApiProperty({ nullable: true, example: 'admin@example.com' })
  notificationRecipientEmail!: string | null;

  @ApiProperty({ nullable: true, example: 'smtp.gmail.com' })
  smtpHost!: string | null;

  @ApiProperty({ nullable: true, example: 587 })
  smtpPort!: number | null;

  @ApiProperty({ enum: ['starttls', 'tls'], example: 'starttls' })
  smtpSecureMode!: 'starttls' | 'tls';

  @ApiProperty({ nullable: true, example: 'smtp-user' })
  smtpUsername!: string | null;

  @ApiProperty({ example: true })
  hasSmtpPassword!: boolean;

  @ApiProperty({ nullable: true, example: 'DockSentinel' })
  smtpFromName!: string | null;

  @ApiProperty({ nullable: true, example: 'noreply@example.com' })
  smtpFromEmail!: string | null;
}
