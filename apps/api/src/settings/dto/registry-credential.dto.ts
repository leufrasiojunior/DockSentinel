import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRegistryCredentialDto {
  @ApiProperty({ example: 'Docker Hub' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'index.docker.io' })
  @IsString()
  @MinLength(1)
  serverAddress!: string;

  @ApiProperty({ example: 'myuser' })
  @IsString()
  @MinLength(1)
  username!: string;

  @ApiProperty({ example: 'dckr_pat_xxxx' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiProperty({ required: false, example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class UpdateRegistryCredentialDto {
  @ApiProperty({ required: false, example: 'Docker Hub' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false, example: 'index.docker.io' })
  @IsString()
  @IsOptional()
  serverAddress?: string;

  @ApiProperty({ required: false, example: 'myuser' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false, example: 'dckr_pat_xxxx' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ required: false, example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class SafeRegistryCredentialDto {
  @ApiProperty({ example: '2f9a-...' })
  id!: string;

  @ApiProperty({ example: 'Docker Hub' })
  name!: string;

  @ApiProperty({ example: 'index.docker.io' })
  serverAddress!: string;

  @ApiProperty({ example: 'myuser' })
  username!: string;

  @ApiProperty({ example: true })
  hasPassword!: boolean;

  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: '2026-03-26T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-03-26T12:00:00.000Z' })
  updatedAt!: string;
}
