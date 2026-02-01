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

  result?: any; // depois tipa com o retorno do recreateContainerWithImage
  error?: string;
};
