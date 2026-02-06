import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { z } from "zod"

export class SchedulerConfigDto {
  @ApiProperty({ description: "Habilita o scheduler", example: true })
  enabled: boolean

  @ApiProperty({
    example: "*/5 * * * *",
    description: "Expressão cron com 5 campos (min hora dom mês dia-semana)",
  })
  cronExpr: string

  @ApiProperty({
    description: "Modo de execução",
    example: "scan_only",
    enum: ["scan_only", "scan_and_update"],
  })
  mode: "scan_only" | "scan_and_update"

  @ApiProperty({
    description: "Escopo de seleção de containers",
    example: "all",
    enum: ["all", "labeled"],
  })
  scope: "all" | "labeled"

  @ApiProperty({
    description: "Label usada para permitir scan quando scope=labeled",
    example: "docksentinel.scan",
  })
  scanLabelKey: string

  @ApiProperty({
    description: "Label usada para permitir update automático",
    example: "docksentinel.update",
  })
  updateLabelKey: string

}

export class UpdateSchedulerConfigPatchDto {
  @ApiPropertyOptional({ description: "Habilita o scheduler", example: true })
  enabled?: boolean

  @ApiPropertyOptional({
    example: "*/10 * * * *",
    description: "Expressão cron com 5 campos (min hora dom mês dia-semana)",
  })
  cronExpr?: string

  @ApiPropertyOptional({
    description: "Modo de execução",
    enum: ["scan_only", "scan_and_update"],
    example: "scan_only",
  })
  mode?: "scan_only" | "scan_and_update"

  @ApiPropertyOptional({
    description: "Escopo de seleção de containers",
    enum: ["all", "labeled"],
    example: "all",
  })
  scope?: "all" | "labeled"

  @ApiPropertyOptional({
    description: "Label usada para permitir scan quando scope=labeled",
    example: "docksentinel.scan",
  })
  scanLabelKey?: string

  @ApiPropertyOptional({
    description: "Label usada para permitir update automático",
    example: "docksentinel.update",
  })
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
