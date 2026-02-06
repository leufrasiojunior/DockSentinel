import { http } from "./http";

export type JobStatus = "queued" | "running" | "done" | "failed" | string;

export type UpdateJob = {
  id: string;
  status: JobStatus;

  // seu backend usa "container"
  container?: string;

  image?: string;
  pull?: boolean;
  force?: boolean;

  createdAt?: string;
  startedAt?: string;
  finishedAt?: string | null;

  lockedAt?: string | null;
  lockedBy?: string | null;

  resultJson?: unknown;
  error?: string | null;

  // tolerante a campos extras
  [key: string]: unknown;
};

export type JobsResponse = {
  total: number;
  items: UpdateJob[];
};

function normalizeJobs(data: unknown): UpdateJob[] {
  if (Array.isArray(data)) return data as UpdateJob[];

  const obj = data as any;
  if (obj && Array.isArray(obj.items)) return obj.items as UpdateJob[];

  return [];
}

export async function listJobs(): Promise<UpdateJob[]> {
  const data = await http<JobsResponse | UpdateJob[]>("/updates/jobs");
  return normalizeJobs(data);
}

// Só mantenha esses endpoints se existirem no backend.
// Se não existirem, comente os botões na UI.
export async function retryJob(id: string): Promise<any> {
  return http<any>(`/updates/jobs/${encodeURIComponent(id)}/retry`, { method: "POST" });
}

export async function deleteJob(id: string): Promise<any> {
  return http<any>(`/updates/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
}
