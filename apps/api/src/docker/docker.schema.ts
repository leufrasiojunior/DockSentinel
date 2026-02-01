import { z } from "zod";

export const recreateBodySchema = z.object({
  image: z.string().min(1).optional(),
  force: z.boolean().optional().default(false),
  pull: z.boolean().optional().default(true),
});

export type RecreateBody = z.infer<typeof recreateBodySchema>;
