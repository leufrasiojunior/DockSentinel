import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from './public.decorator';
import { SettingsService } from '../settings/settings.service';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';

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
  @ApiOperation({ summary: 'Get authentication status' })
  @ApiResponse({
    status: 200,
    description: 'Returns the authentication mode.',
  })
  async getStatus() {
    // getAuthMode() é async, então precisamos await
    return { authMode: await this.settings.getAuthMode() };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login' })
  @ApiResponse({ status: 201, description: 'Login successful.' })
  @ApiResponse({ status: 400, description: 'Invalid credentials.' })
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
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'User is authenticated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  me() {
    return { authenticated: true };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout' })
  @ApiResponse({ status: 200, description: 'Logout successful.' })
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
