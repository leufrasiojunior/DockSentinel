import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator"

export class SmtpTestDto {
  @ApiPropertyOptional({ example: "admin@example.com" })
  @IsEmail()
  @IsOptional()
  notificationRecipientEmail?: string

  @ApiPropertyOptional({ example: "smtp.gmail.com" })
  @IsString()
  @IsOptional()
  smtpHost?: string

  @ApiPropertyOptional({ example: 587 })
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  smtpPort?: number

  @ApiPropertyOptional({ enum: ["starttls", "tls"], example: "starttls" })
  @IsEnum(["starttls", "tls"])
  @IsOptional()
  smtpSecureMode?: "starttls" | "tls"

  @ApiPropertyOptional({ example: "smtp-user" })
  @IsString()
  @IsOptional()
  smtpUsername?: string

  @ApiPropertyOptional({ example: "smtp-password" })
  @IsString()
  @IsOptional()
  smtpPassword?: string

  @ApiPropertyOptional({ example: "DockSentinel" })
  @IsString()
  @IsOptional()
  smtpFromName?: string

  @ApiPropertyOptional({ example: "noreply@example.com" })
  @IsEmail()
  @IsOptional()
  smtpFromEmail?: string
}
