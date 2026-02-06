import { ApiProperty } from '@nestjs/swagger';

export type AuthMode = 'none' | 'password' | 'totp' | 'both';

export class AuthStatusResponseDto {
  @ApiProperty({
    description: 'Modo de autenticação atual',
    enum: ['none', 'password', 'totp', 'both'],
    example: 'none',
  })
  authMode!: AuthMode;
}

export class AuthMeResponseDto {
  @ApiProperty({
    description: 'Indica se o usuário está autenticado',
    example: true,
  })
  authenticated!: boolean;
}
