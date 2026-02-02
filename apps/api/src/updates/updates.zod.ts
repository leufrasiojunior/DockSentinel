import { z } from "zod"

export const createUpdateJobSchema = z.object({
  container: z.string().min(1),
  image: z.string().min(1).optional(),
  force: z.boolean().optional().default(false),
  pull: z.boolean().optional().default(true),
})

export type CreateUpdateJobBody = z.infer<typeof createUpdateJobSchema>
