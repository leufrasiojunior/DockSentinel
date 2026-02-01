import { ApiPropertyOptional } from "@nestjs/swagger"
import { z } from "zod"

export class UpdateDto {
  @ApiPropertyOptional({
    description: "Força a atualização mesmo se hasUpdate=false ou sem remoteDigest",
    example: false,
    default: false,
  })
  force?: boolean

  @ApiPropertyOptional({
    description: "Faz pull antes de recriar",
    example: true,
    default: true,
  })
  pull?: boolean
}

export const updateBodySchema = z.object({
  force: z.boolean().optional().default(false),
  pull: z.boolean().optional().default(true),
})

export type UpdateBody = z.infer<typeof updateBodySchema>
