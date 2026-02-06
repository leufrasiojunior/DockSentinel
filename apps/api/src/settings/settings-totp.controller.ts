import { Body, Controller, Post, UsePipes } from "@nestjs/common"
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe" // ajuste o path se necessário
import {
  TotpConfirmDto,
  TotpConfirmResponseDto,
  TotpInitDto,
  TotpInitResponseDto,
  totpConfirmSchema,
  totpInitSchema,
} from "./dto/totp.dto"
import { TotpEnrollmentService } from "./totp-enrollment.service"

@ApiTags("Settings")
@Controller("settings/totp")
export class SettingsTotpController {
  constructor(private readonly totp: TotpEnrollmentService) {}

  @Post("init")
  @UsePipes(new ZodValidationPipe(totpInitSchema))
  @ApiOperation({ summary: "Inicia ativação do TOTP (retorna otpauthUrl para QR)" })
  @ApiBody({ type: TotpInitDto })
  @ApiCreatedResponse({ description: "Desafio TOTP criado.", type: TotpInitResponseDto })
  @ApiBadRequestResponse({ description: "Dados inválidos." })
  async init(@Body() body: TotpInitDto): Promise<TotpInitResponseDto> {
    return this.totp.init(body.label)
  }

  @Post("confirm")
  @UsePipes(new ZodValidationPipe(totpConfirmSchema))
  @ApiOperation({ summary: "Confirma ativação do TOTP (valida token e grava no DB)" })
  @ApiBody({ type: TotpConfirmDto })
  @ApiCreatedResponse({ description: "TOTP confirmado e ativado.", type: TotpConfirmResponseDto })
  @ApiBadRequestResponse({ description: "Token inválido." })
  async confirm(@Body() body: TotpConfirmDto): Promise<TotpConfirmResponseDto> {
    const res = await this.totp.confirm(body.challengeId, body.token)
    return res
  }
}
