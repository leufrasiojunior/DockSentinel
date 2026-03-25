import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

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
    description: 'Idioma padrão da aplicação',
    enum: ['pt-BR', 'en-US'],
    required: false,
    example: 'pt-BR',
  })
  @IsEnum(['pt-BR', 'en-US'])
  @IsOptional()
  defaultLocale?: 'pt-BR' | 'en-US';

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

  @ApiProperty({ required: false, example: true })
  @IsBoolean()
  @IsOptional()
  notificationsInAppEnabled?: boolean;

  @ApiProperty({ required: false, example: false })
  @IsBoolean()
  @IsOptional()
  notificationsEmailEnabled?: boolean;

  @ApiProperty({
    required: false,
    enum: ['all', 'errors_only'],
    example: 'all',
  })
  @IsEnum(['all', 'errors_only'])
  @IsOptional()
  notificationLevel?: 'all' | 'errors_only';

  @ApiProperty({ required: false, example: 15 })
  @IsInt()
  @Min(1)
  @Max(3650)
  @IsOptional()
  notificationReadRetentionDays?: number;

  @ApiProperty({ required: false, example: 60 })
  @IsInt()
  @Min(1)
  @Max(3650)
  @IsOptional()
  notificationUnreadRetentionDays?: number;

  @ApiProperty({ required: false, example: 5 })
  @IsInt()
  @Min(1)
  @Max(1440)
  @IsOptional()
  environmentHealthcheckIntervalMin?: number;

  @ApiProperty({ required: false, nullable: true, example: 'admin@example.com' })
  @IsEmail()
  @IsOptional()
  notificationRecipientEmail?: string;

  @ApiProperty({ required: false, nullable: true, example: 'smtp.gmail.com' })
  @IsString()
  @IsOptional()
  smtpHost?: string;

  @ApiProperty({ required: false, nullable: true, example: 587 })
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  smtpPort?: number;

  @ApiProperty({
    required: false,
    enum: ['starttls', 'tls'],
    example: 'starttls',
  })
  @IsEnum(['starttls', 'tls'])
  @IsOptional()
  smtpSecureMode?: 'starttls' | 'tls';

  @ApiProperty({ required: false, nullable: true, example: 'smtp-user' })
  @IsString()
  @IsOptional()
  smtpUsername?: string;

  @ApiProperty({ required: false, nullable: true, example: 'smtp-password' })
  @IsString()
  @IsOptional()
  smtpPassword?: string;

  @ApiProperty({ required: false, nullable: true, example: 'DockSentinel' })
  @IsString()
  @IsOptional()
  smtpFromName?: string;

  @ApiProperty({ required: false, nullable: true, example: 'noreply@example.com' })
  @IsEmail()
  @IsOptional()
  smtpFromEmail?: string;
}
