import { z } from "zod"
import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator"

export class UpdateSchedulerDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @ApiPropertyOptional({ example: "*/5 * * * *" })
  @IsOptional()
  @IsString()
  cronExpr?: string

  @ApiPropertyOptional({ example: "scan_only", enum: ["scan_only", "scan_and_update"] })
  @IsOptional()
  @IsIn(["scan_only", "scan_and_update"])
  mode?: "scan_only" | "scan_and_update"

  @ApiPropertyOptional({ example: "all", enum: ["all", "labeled"] })
  @IsOptional()
  @IsIn(["all", "labeled"])
  scope?: "all" | "labeled"

  @ApiPropertyOptional({ example: "docksentinel.scan" })
  @IsOptional()
  @IsString()
  scanLabelKey?: string

  @ApiPropertyOptional({ example: "docksentinel.update" })
  @IsOptional()
  @IsString()
  updateLabelKey?: string
}


export const updateSchedulerSchema = z.object({
  enabled: z.boolean().optional(),
  cronExpr: z.string().min(1).optional(),
  mode: z.enum(["scan_only", "scan_and_update"]).optional(),
  scope: z.enum(["all", "labeled"]).optional(),
  scanLabelKey: z.string().min(1).optional(),
  updateLabelKey: z.string().min(1).optional(),
})
