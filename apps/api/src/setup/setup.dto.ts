import { IsIn, IsOptional, IsString, MinLength } from "class-validator"

/**
 * DTO (Data Transfer Object)
 * - define o formato do body aceito em /setup
 * - class-validator valida os campos (docs Nest: ValidationPipe)
 */
export class SetupDto {
  @IsIn(["none", "password", "totp", "both"])
  authMode!: "none" | "password" | "totp" | "both"

  @IsOptional()
  @IsIn(["error", "warn", "info", "debug"])
  logLevel?: "error" | "warn" | "info" | "debug"

  // usado quando authMode = password | both
  @IsOptional()
  @IsString()
  @MinLength(8)
  adminPassword?: string

  // usado quando authMode = totp | both
  @IsOptional()
  @IsString()
  @MinLength(16)
  totpSecret?: string
}
