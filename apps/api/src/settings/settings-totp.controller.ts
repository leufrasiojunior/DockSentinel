import { Body, Controller, Post, UsePipes } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
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

@ApiTags("settings")
@Controller("settings/totp")
export class SettingsTotpController {
  constructor(private readonly totp: TotpEnrollmentService) {}

  @Post("init")
  @UsePipes(new ZodValidationPipe(totpInitSchema))
  @ApiOperation({ summary: "Inicia ativação do TOTP (retorna otpauthUrl para QR)" })
  @ApiResponse({ status: 201, type: TotpInitResponseDto })
  async init(@Body() body: TotpInitDto): Promise<TotpInitResponseDto> {
    return this.totp.init(body.label)
  }

  @Post("confirm")
  @UsePipes(new ZodValidationPipe(totpConfirmSchema))
  @ApiOperation({ summary: "Confirma ativação do TOTP (valida token e grava no DB)" })
  @ApiResponse({ status: 201, type: TotpConfirmResponseDto })
  async confirm(@Body() body: TotpConfirmDto): Promise<TotpConfirmResponseDto> {
    const res = await this.totp.confirm(body.challengeId, body.token)
    return res
  }
}
