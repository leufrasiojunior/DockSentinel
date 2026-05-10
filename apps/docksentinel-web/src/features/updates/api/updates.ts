import { http } from "../../../shared/api/http";
import { type UpdateCheckResult } from "../../docker/api/docker";

export type ScanMode = "scan_only" | "scan_and_update";

export type ScanResultOk = UpdateCheckResult & {
  name: string;
  autoUpdateDisabled: boolean;
  allowAutoUpdate: boolean;
};

export type ScanResultError = {
  name: string;
  error: string;
  autoUpdateDisabled: boolean;
  allowAutoUpdate: boolean;
};

export type ScanResult = ScanResultOk | ScanResultError;

export type EnqueueManyResult = {
  queued: Array<{ container: string; jobId: string }>;
  skipped: Array<{ container: string; reason: string }>;
};

export type ScanAndEnqueueResult = {
  scanned: number;
  mode: ScanMode;
  queued: EnqueueManyResult | null;
  results: ScanResult[];
};

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
export async function scanAndEnqueue(
  environmentId: string,
  mode?: ScanMode,
): Promise<ScanAndEnqueueResult> {
  const init =
    mode === undefined
      ? { method: "POST" as const }
      : { method: "POST" as const, body: { mode } };

  return http<ScanAndEnqueueResult>(
    `/api/environments/${encodeURIComponent(environmentId)}/updates/scan-and-enqueue`,
    init,
  );
}
