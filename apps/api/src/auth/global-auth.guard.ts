import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { IS_PUBLIC_KEY } from "../auth/public.decorator"

import { SessionService } from "../auth/session.service"
import { SettingsService } from "../settings/settings.service"

/**
 * GlobalAuthGuard:
 * - se authMode = none => libera tudo
 * - se rota tem @Public => libera
 * - caso contrário exige cookie de sessão válido
 *
 * Agora é async porque authMode vem do DB.
 */
@Injectable()
export class GlobalAuthGuard implements CanActivate {
  private readonly logger = new Logger(GlobalAuthGuard.name)

  constructor(
    private readonly reflector: Reflector,
    private readonly settings: SettingsService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const authMode = await this.settings.getAuthMode()
    if (authMode === "none") return true

    const req = context.switchToHttp().getRequest<any>()
    const sessionId = req.signedCookies?.ds_session

    const ok = this.sessions.validate(sessionId)
    if (!ok) this.logger.warn("Unauthorized request (invalid or missing session)")
    return ok
  }
}
