import { http } from "../../../shared/api/http";

export type SchedulerMode = "scan_only" | "scan_and_update" | string;
export type SchedulerScope = "all" | "labeled" | string;

export type SchedulerConfig = {
  environmentId: string;
  environmentName: string;
  enabled: boolean;
  cronExpr: string;
  mode: SchedulerMode;
  scope: SchedulerScope;
  scanLabelKey: string;
  updateLabelKey: string;

  lastRunAt: string | null;
  running: boolean;
  lockedAt: string | null;
  lockedBy: string | null;

  createdAt: string;
  updatedAt: string;
};

export type SchedulerRuntime = {
  hasJob: boolean;
  enabled: boolean;
  ticking: boolean;
  timeZone: string;

  nextScanAt: string | null;

  lastRunAt: string | null;
  lastFinishedAt: string | null;

  lastError: string | null;
  lastResult: unknown | null;
};

export type SchedulerBundle = {
  config: SchedulerConfig;
  runtime: SchedulerRuntime;
};

/**
 * GET environment scheduler status
 */
export async function getSchedulerBundle(environmentId: string): Promise<SchedulerBundle> {
  return http<SchedulerBundle>(
    `/api/environments/${encodeURIComponent(environmentId)}/scheduler/status`,
  );
}

/**
 * PATCH /updates/scheduler/config
 * (UpdateSchedulerConfigPatchDto)
 */
export async function patchSchedulerConfig(environmentId: string, body: {
  enabled?: boolean;
  cronExpr?: string;
  mode?: SchedulerMode;
  scope?: SchedulerScope;
  scanLabelKey?: string;
  updateLabelKey?: string;
}): Promise<any> {
  return http<any>(`/api/environments/${encodeURIComponent(environmentId)}/scheduler/config`, {
    method: "PATCH",
    body,
  });
}

/**
 * POST /updates/scan-and-enqueue
 * (sem body no Swagger)
 */
export async function scanAndEnqueue(environmentId: string): Promise<any> {
  return http<any>(`/api/environments/${encodeURIComponent(environmentId)}/updates/scan-and-enqueue`, {
    method: "POST",
  });
}
