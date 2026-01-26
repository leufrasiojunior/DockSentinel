import { z } from "zod"

/**
 * Schema de validação do ENV.
 * A regra: se o ENV estiver inválido, o app NÃO sobe.
 *
 * Isso evita bug “silencioso” em produção.
 */
export const envSchema = z.object({
  /**
   * Porta do Nest.
   * Default: 3000
   */
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  /**
   * Nível de log do DockSentinel.
   * Vamos mapear isso para os níveis do Logger do Nest.
   */
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  /**
   * Banco SQLite via Prisma.
   * Em Docker, vamos usar volume /data.
   */
  DATABASE_URL: z.string().min(1).default("file:/data/docksentinel.db"),

  /**
   * Intervalo do scheduler em minutos (Update Engine no futuro).
   * Default: 5
   */
  SCHEDULER_INTERVAL_MIN: z.coerce.number().int().min(1).max(1440).default(5),

  /**
   * Secret master para criptografar campos sensíveis (registry password, smtp password, totp secret).
   * Para POC real, exigimos pelo menos 32 chars.
   * (Depois podemos reforçar com 64 bytes base64, etc.)
   */
  DOCKSENTINEL_SECRET: z.string().min(32).default("CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN"),

  /**
   * Auth Mode (por enquanto via ENV; depois pode ir para DB e o ENV vira “setup default”).
   */
  AUTH_MODE: z.enum(["none", "password", "totp", "both"]).default("none"),

/**
     * Senha única do admin (inicialmente via ENV).
     * Depois, isso vai para o DB via /setup e ficará criptografado.
     */
    ADMIN_PASSWORD: z.string().min(8).optional(),

    /**
     * Secret base32 do TOTP (inicialmente via ENV).
     * Depois, isso vai para o DB via /setup e ficará criptografado.
     */
    TOTP_SECRET: z.string().min(16).optional(),

    /**
     * Nome do cookie de sessão (pra não ficar hardcoded).
     */
    SESSION_COOKIE_NAME: z.string().min(1).default("ds_session"),

    /**
     * TTL da sessão em horas.
     */
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  })
  .superRefine((val, ctx) => {
    // Se o modo exige password, a senha deve existir
    if ((val.AUTH_MODE === "password" || val.AUTH_MODE === "both") && !val.ADMIN_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ADMIN_PASSWORD"],
        message: "ADMIN_PASSWORD is required when AUTH_MODE is password|both",
      })
    }

    // Se o modo exige totp, o secret deve existir
    if ((val.AUTH_MODE === "totp" || val.AUTH_MODE === "both") && !val.TOTP_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TOTP_SECRET"],
        message: "TOTP_SECRET is required when AUTH_MODE is totp|both",
      })
    }
  })

export type Env = z.infer<typeof envSchema>

/**
 * Faz o parse + validação.
 * Se der erro, lançamos exceção e o Nest não sobe.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw)

  if (!parsed.success) {
    // Mostra erros de forma legível
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    throw new Error(`Invalid environment variables: ${issues}`)
  }

  return parsed.data
}
