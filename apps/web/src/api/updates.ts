import { fetchJson } from "./client";
import type { JobsListResponse, SchedulerConfig } from "./types";

export const updatesApi = {
  jobs: (params: { take?: number; skip?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.take) q.set("take", String(params.take));
    if (params.skip) q.set("skip", String(params.skip));
    return fetchJson<JobsListResponse>(`/updates/jobs?${q.toString()}`);
  },
  jobById: (id: string) => fetchJson<any>(`/updates/jobs/${encodeURIComponent(id)}`),

  // HANDOFF: scan manual com mode no body
  scanAndEnqueue: (body: { mode: "scan_only" | "scan_and_update" }) =>
    fetchJson<any>("/updates/scan-and-enqueue", { method: "POST", body }),

  batch: (body: { items: Array<{ container: string; image?: string | null; force?: boolean; pull?: boolean }> }) =>
    fetchJson<void>("/updates/batch", { method: "POST", body }),

  schedulerConfig: () => fetchJson<SchedulerConfig>("/updates/scheduler/config"),
  schedulerConfigPatch: (body: Partial<SchedulerConfig>) =>
    fetchJson<SchedulerConfig>("/updates/scheduler/config", { method: "PATCH", body }),
  schedulerStatus: () => fetchJson<any>("/updates/scheduler/scheduler"),
};
