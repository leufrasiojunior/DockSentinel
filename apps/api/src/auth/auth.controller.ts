import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from './public.decorator';
import { SettingsService } from '../settings/settings.service';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import {
  AuthMeResponseDto,
  AuthStatusResponseDto,
} from './dto/auth-responses.dto';
import { OkResponseDto } from '../common/dto/ok-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly settings: SettingsService,
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Obter status de autenticação' })
  @ApiOkResponse({
    description: 'Retorna o modo de autenticação atual.',
    type: AuthStatusResponseDto,
  })
  async getStatus() {
    const authMode = await this.settings.getAuthMode();
    return { authMode };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Fazer login' })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({
    description: 'Login realizado com sucesso.',
    type: OkResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Credenciais inválidas.' })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // ✅ valida credenciais conforme AUTH_MODE
    await this.auth.validateLogin(body);

    // ✅ cria sessão
    const { sessionId, expiresAt } = this.sessions.create();

    // ✅ cookie assinado HttpOnly
    res.cookie('ds_session', sessionId, {
      httpOnly: true,
      path: "/",
      sameSite: 'lax',
      signed: true,
      expires: new Date(expiresAt),
      secure: false
    });

    return { ok: true };
  }

  /**
   * ✅ rota protegida (não é @Public)
   * se o guard deixou passar, a sessão é válida
   */
  @Get('me')
  @ApiOperation({ summary: 'Obter sessão atual' })
  @ApiOkResponse({
    description: 'Usuário autenticado.',
    type: AuthMeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Não autorizado.' })
  me() {
    return { authenticated: true };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Fazer logout' })
  @ApiOkResponse({
    description: 'Logout realizado com sucesso.',
    type: OkResponseDto,
  })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('ds_session', {
      httpOnly: true,
      sameSite: 'lax',
      signed: true,
      secure: process.env.NODE_ENV === 'production',
    });
    return { ok: true };
  }
}
