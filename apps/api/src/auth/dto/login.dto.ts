import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Senha para login. Obrigatória quando o modo é password/both.',
    required: false,
    example: 'MinhaSenha123!',
  })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({
    description: 'Código TOTP de 6 dígitos. Obrigatório quando o modo é totp/both.',
    required: false,
    example: '123456',
  })
  @IsString()
  @IsOptional()
  totp?: string;
}
