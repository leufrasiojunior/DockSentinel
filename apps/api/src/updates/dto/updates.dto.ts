import { ApiProperty } from "@nestjs/swagger"
import { z } from "zod"

export class EnqueueDto {
  @ApiProperty({ example: "homarr" })
  container!: string

  @ApiProperty({ example: "ghcr.io/homarr-labs/homarr:latest", required: false, nullable: true })
  image?: string | null

  @ApiProperty({ required: false, default: false })
  force?: boolean

  @ApiProperty({ required: false, default: true })
  pull?: boolean
}

export class BatchDto {
  @ApiProperty({ type: [EnqueueDto] })
  items!: EnqueueDto[]
}

export class JobsQueryDto {
  @ApiProperty({ required: false, example: "homarr" })
  container?: string

  @ApiProperty({ required: false, example: "queued" })
  status?: "queued" | "running" | "success" | "failed"

  @ApiProperty({ required: false, default: 50, example: 50 })
  take?: number

  @ApiProperty({ required: false, example: "0" })
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
