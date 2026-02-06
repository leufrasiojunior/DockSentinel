import { ApiProperty } from "@nestjs/swagger"
import { z } from "zod"

export class EnqueueDto {
  @ApiProperty({
    description: "Nome do container alvo",
    example: "homarr",
  })
  container!: string

  @ApiProperty({
    description: "Imagem alvo (opcional; padrão: imagem atual do container)",
    example: "ghcr.io/homarr-labs/homarr:latest",
    required: false,
    nullable: true,
  })
  image?: string | null

  @ApiProperty({
    description: "Força enfileirar mesmo se já estiver atualizado",
    required: false,
    default: false,
    example: false,
  })
  force?: boolean

  @ApiProperty({
    description: "Faz pull antes de atualizar",
    required: false,
    default: true,
    example: true,
  })
  pull?: boolean
}

export class BatchDto {
  @ApiProperty({ description: "Itens para enfileirar", type: [EnqueueDto] })
  items!: EnqueueDto[]
}

export class JobsQueryDto {
  @ApiProperty({
    description: "Filtra por container",
    required: false,
    example: "homarr",
  })
  container?: string

  @ApiProperty({
    description: "Filtra por status",
    required: false,
    example: "queued",
  })
  status?: "queued" | "running" | "success" | "failed"

  @ApiProperty({
    description: "Quantidade máxima de itens",
    required: false,
    default: 50,
    example: 50,
  })
  take?: number

  @ApiProperty({
    description: "Offset para paginação",
    required: false,
    example: 0,
  })
  skip?: number
}

export const enqueueSchema = z.object({
  container: z.string().min(1),
  image: z.string().min(1).nullable().optional(),
  force: z.boolean().optional().default(false),
  pull: z.boolean().optional().default(true),
})

export const batchSchema = z.object({
  items: z.array(enqueueSchema).default([]),
})

export const jobsQuerySchema = z.object({
  container: z.string().min(1).optional(),
  status: z.enum(["queued", "running", "success", "failed"]).optional(),
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
});

export type EnqueueInput = z.infer<typeof enqueueSchema>
export type JobsQuery = z.infer<typeof jobsQuerySchema>
