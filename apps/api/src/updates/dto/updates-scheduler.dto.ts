import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { z } from "zod"

export class SchedulerConfigDto {
  @ApiProperty({ example: true })
  enabled: boolean

  @ApiProperty({ example: "*/5 * * * *", description: "Cron com 5 campos (min hour dom mon dow)" })
  cronExpr: string

  @ApiProperty({ example: "scan_only", enum: ["scan_only", "scan_and_update"] })
  mode: "scan_only" | "scan_and_update"

  @ApiProperty({ example: "all", enum: ["all", "labeled"] })
  scope: "all" | "labeled"

  @ApiProperty({ example: "docksentinel.scan" })
  scanLabelKey: string

  @ApiProperty({ example: "docksentinel.update" })
  updateLabelKey: string

  @ApiProperty({ example: "2026-01-24T19:51:35.484Z" })
  updatedAt: Date
}

export class UpdateSchedulerConfigPatchDto {
  @ApiPropertyOptional({ example: true })
  enabled?: boolean

  @ApiPropertyOptional({
    example: "*/10 * * * *",
    description: "Cron com 5 campos (min hour dom mon dow)",
  })
  cronExpr?: string

  @ApiPropertyOptional({ enum: ["scan_only", "scan_and_update"], example: "scan_only" })
  mode?: "scan_only" | "scan_and_update"

  @ApiPropertyOptional({ enum: ["all", "labeled"], example: "all" })
  scope?: "all" | "labeled"

  @ApiPropertyOptional({ example: "docksentinel.scan" })
  scanLabelKey?: string

  @ApiPropertyOptional({ example: "docksentinel.update" })
  updateLabelKey?: string
}

/**
 * Zod (para validar request body)
 */
export const schedulerPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    cronExpr: z.string().min(1).optional(),
    mode: z.enum(["scan_only", "scan_and_update"]).optional(),
    scope: z.enum(["all", "labeled"]).optional(),
    scanLabelKey: z.string().min(1).optional(),
    updateLabelKey: z.string().min(1).optional(),
  })
  .strict()

export type SchedulerPatch = z.infer<typeof schedulerPatchSchema>
