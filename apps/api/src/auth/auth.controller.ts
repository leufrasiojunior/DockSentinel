import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from './public.decorator';
import { SettingsService } from '../settings/settings.service';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly settings: SettingsService,
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Get('status')
  async getStatus() {
    // getAuthMode() é async, então precisamos await
return { authMode: await this.settings.getAuthMode() }
  }

  @Public()
  @Post('login')
  async login(
    @Body() body: { password?: string; totp?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    // ✅ valida credenciais conforme AUTH_MODE
    await this.auth.validateLogin(body);

    // ✅ cria sessão
    const { sessionId, expiresAt } = this.sessions.create();

    // ✅ cookie assinado HttpOnly
    res.cookie('ds_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      signed: true,
      expires: new Date(expiresAt),
      secure: process.env.NODE_ENV === 'production',
    });

    return { ok: true };
  }

  /**
   * ✅ rota protegida (não é @Public)
   * se o guard deixou passar, a sessão é válida
   */
  @Get('me')
  me() {
    return { authenticated: true };
  }

  @Post('logout')
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
