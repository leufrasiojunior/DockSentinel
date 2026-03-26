import { Body, Controller, Get, Post } from "@nestjs/common"
import { AgentAuthStateService } from "./agent-auth-state.service"

@Controller("agent/v1/admin/rotation")
export class RotationAdminController {
  constructor(private readonly authState: AgentAuthStateService) {}

  @Post("enter")
  async enter() {
    const state = await this.authState.enterPendingRotation()
    return { ok: true as const, state }
  }

  @Get("status")
  async status() {
    return this.authState.getStatus()
  }

  @Post("complete")
  async complete(@Body("credential") credential?: string, @Body() body?: Record<string, unknown>) {
    const value = credential ?? (typeof body?.credential === "string" ? body.credential : "")
    const state = await this.authState.completeRotation(value)

    return {
      ok: true as const,
      state,
    }
  }
}
