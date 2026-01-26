import { Controller, Get } from "@nestjs/common"
import { Public } from "../auth/public.decorator"

/**
 * Health endpoint:
 * - deve ser público (para docker/monitoramento)
 * - útil para e2e e para o futuro compose/ingress
 */
@Controller("health")
export class HealthController {
  @Public()
  @Get()
  getHealth() {
    return { ok: true }
  }
}
