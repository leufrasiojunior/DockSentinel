import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"
import type { Request } from "express"

@Injectable()
export class AgentAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>()
    const token = process.env.DOCKSENTINEL_AGENT_TOKEN?.trim()
    if (!token) {
      throw new UnauthorizedException("Agent token is not configured")
    }

    const auth = req.headers.authorization ?? ""
    const expected = `Bearer ${token}`
    if (auth !== expected) {
      throw new UnauthorizedException("Invalid agent token")
    }

    return true
  }
}
