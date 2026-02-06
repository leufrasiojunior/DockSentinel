import { http } from "./http";

export type ScanMode = "scan_only" | "scan_and_update";

/**
 * POST /updates/scan-and-enqueue
 *
 * Observação importante:
 * - No swagger.json essa rota não declara requestBody.
 * - No HANDOFF ela aceita { mode }.
 *
 * Então aqui a gente manda body *apenas* quando mode foi informado.
 * Se o backend ignorar body, continua funcionando.
 */
export async function scanAndEnqueue(mode?: ScanMode): Promise<any> {
  const init =
    mode === undefined
      ? { method: "POST" as const }
      : { method: "POST" as const, body: { mode } };

  return http<any>("/updates/scan-and-enqueue", init as any);
}
