export type AuthMode = "none" | "password" | "totp" | "both";

export type ContainerState = "running" | "exited" | "paused" | "restarting" | "dead" | "created" | "stopped";

export interface ContainerSummary {
  id: string;
  name: string;
  image: string;
  state: string;   // a API devolve string ("running" etc.)
  status: string;  // "Up 33 minutes", etc.
  labels: Record<string, string>;
}

export type JobStatus = "queued" | "running" | "success" | "failed";

export interface UpdateJob {
  id: string;
  status: JobStatus;
  container: string;
  image: string;
  force: boolean;
  pull: boolean;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  resultJson?: string | null;
  error?: string | null;
}

export interface JobsListResponse {
  total: number;
  items: UpdateJob[];
}

export interface SchedulerConfig {
  enabled: boolean;
  cronExpr: string;
  mode: "scan_only" | "scan_and_update";
  scope: "all" | "labeled";
  scanLabelKey: string;
  updateLabelKey: string;
  updatedAt?: string;
  // No HANDOFF aparece também lastRunAt/running/locked* (vamos tratar como opcionais)
  lastRunAt?: string | null;
  running?: boolean;
  lockedAt?: string | null;
  lockedBy?: string | null;
}

export interface UpdateCheckResult {
  container: string;
  imageRef: string;

  localImageId?: string | null;     // sha256:...
  remoteDigest?: string | null;     // sha256:...
  repoDigests: string[];

  canCheckRemote: boolean;
  canCheckLocal: boolean;
  hasUpdate: boolean;
}
