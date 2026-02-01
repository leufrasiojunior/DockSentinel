import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { z } from "zod"

// ---------- INIT ----------
export class TotpInitResponseDto {
  @ApiProperty({
    description: "ID temporário do desafio (usar no /confirm). Expira em poucos minutos.",
    example: "b6a4c9b9-8c40-4b77-a2ce-19a2bd2c5f91",
  })
  challengeId!: string

  @ApiProperty({
    description: "URL otpauth://... para gerar o QR Code no frontend.",
    example:
      "otpauth://totp/DockSentinel:admin?secret=JBSWY3DPEHPK3PXP&issuer=DockSentinel&digits=6&period=30&algorithm=SHA1",
  })
  otpauthUrl!: string

  @ApiProperty({
    description: "Secret em Base32 (fallback caso o usuário não consiga escanear o QR).",
    example: "JBSWY3DPEHPK3PXP",
  })
  secret!: string

  @ApiProperty({
    description: "Quando esse challenge expira (ISO).",
    example: "2026-01-24T20:15:00.000Z",
  })
  expiresAt!: string
}

export class TotpInitDto {
  @ApiPropertyOptional({
    description: "Label da conta no app de autenticação (ex: admin).",
    example: "admin",
  })
  label?: string
}

export const totpInitSchema = z.object({
  label: z.string().min(1).max(64).optional(),
})

// ---------- CONFIRM ----------
export class TotpConfirmDto {
  @ApiProperty({
    description: "challengeId retornado pelo /init",
    example: "b6a4c9b9-8c40-4b77-a2ce-19a2bd2c5f91",
  })
  challengeId!: string

  @ApiProperty({
    description: "Código TOTP de 6 dígitos",
    example: "123456",
  })
  token!: string
}

export class TotpConfirmResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean

  @ApiProperty({
    description: "Modo final de auth gravado no DB (após confirmar).",
    example: "both",
  })
  authMode!: "none" | "password" | "totp" | "both"
}

export const totpConfirmSchema = z.object({
  challengeId: z.string().uuid(),
  token: z.string().regex(/^\d{6}$/, "token must be 6 digits"),
})
