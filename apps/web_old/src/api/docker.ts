import { fetchJson } from "./client";
import type { ContainerSummary, UpdateCheckResult } from "./types";

export const dockerApi = {
  listContainers: () => fetchJson<ContainerSummary[]>("/docker/containers"),
  updateCheck: (name: string) =>
    fetchJson<UpdateCheckResult>(`/docker/containers/${encodeURIComponent(name)}/update-check`),
  update: (name: string, body: { force?: boolean; pull?: boolean } = {}) =>
    fetchJson<any>(`/docker/containers/${encodeURIComponent(name)}/update`, { method: "POST", body }),
};
