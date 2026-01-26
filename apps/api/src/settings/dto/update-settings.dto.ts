import { z } from "zod"

/**
 * Zod schema para atualizar settings globais.
 * - Todos são opcionais porque PUT pode mandar só parte.
 */
export const UpdateSettingsSchema = z.object({
  authMode: z.enum(["none", "password", "totp", "both"]).optional(),
  logLevel: z.enum(["error", "warn", "info", "debug"]).optional(),

  /**
   * Atualização de password:
   * - quando enviado, a gente vai hashear e salvar adminPasswordHash.
   */
  adminPassword: z.string().min(8).optional(),

  /**
   * Atualização de TOTP secret:
   * - quando enviado, a gente criptografa e salva totpSecretEnc.
   */
  totpSecret: z.string().min(16).optional(),
})

export type UpdateSettingsDto = z.infer<typeof UpdateSettingsSchema>
