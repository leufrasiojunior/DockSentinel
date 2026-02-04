import type { ContainerUpdateResult } from "../docker/docker-update.service";

export type UpdateJobStatus = "queued" | "running" | "success" | "failed";

export type UpdateJobPayload = {
  container: string;
  image?: string;
  force?: boolean;
  pull?: boolean;
};

export type UpdateJob = {
  id: string;
  status: UpdateJobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;

  payload: UpdateJobPayload;

  result?: ContainerUpdateResult;
  error?: string;
};
