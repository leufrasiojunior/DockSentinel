import { Body, Controller, Post } from "@nestjs/common"
import { Public } from "../auth/public.decorator"
import { SetupDto } from "./setup.dto"
import { SetupService } from "./setup.service"

/**
 * SetupController:
 * - rota pública para primeira configuração
 * - depois do setup, retorna 409 (via service)
 */
@Controller("setup")
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Public()
  @Post()
  async run(@Body() body: SetupDto) {
    return this.setup.runSetup(body)
  }
}
