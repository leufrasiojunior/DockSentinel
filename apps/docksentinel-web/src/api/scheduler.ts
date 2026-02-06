import { http } from "./http";

export type SchedulerMode = "scan_only" | "scan_and_update" | string;
export type SchedulerScope = "all" | "labeled" | string;

export type SchedulerConfig = {
  id: number;
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
 * GET /updates/scheduler/scheduler
 */
export async function getSchedulerBundle(): Promise<SchedulerBundle> {
  return http<SchedulerBundle>("/updates/scheduler/scheduler");
}

/**
 * PATCH /updates/scheduler/config
 * (UpdateSchedulerConfigPatchDto)
 */
export async function patchSchedulerConfig(body: {
  enabled?: boolean;
  cronExpr?: string;
  mode?: SchedulerMode;
  scope?: SchedulerScope;
  scanLabelKey?: string;
  updateLabelKey?: string;
}): Promise<any> {
  return http<any>("/updates/scheduler/config", {
    method: "PATCH",
    body,
  });
}

/**
 * POST /updates/scan-and-enqueue
 * (sem body no Swagger)
 */
export async function scanAndEnqueue(): Promise<any> {
  return http<any>("/updates/scan-and-enqueue", { method: "POST" });
}
