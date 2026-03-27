import { http } from "../../../shared/api/http";

export type EnvironmentKind = "local" | "remote";
export type EnvironmentStatus = "online" | "offline";
export type EnvironmentRotationState =
  | "unpaired"
  | "ready_to_pair"
  | "paired"
  | "pending_rotation"
  | "ready_to_complete";
export type EnvironmentSetupPhase =
  | "waiting_for_agent"
  | "waiting_for_token"
  | "ready_to_complete"
  | "blocked";
export type EnvironmentSetupBlockingReason = "agent_already_paired";

export type Environment = {
  id: string;
  kind: EnvironmentKind;
  name: string;
  baseUrl?: string | null;
  hasToken: boolean;
  rotationState: EnvironmentRotationState;
  agentVersion?: string | null;
  dockerVersion?: string | null;
  lastSeenAt?: string | null;
  lastError?: string | null;
  status: EnvironmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type EnvironmentListResponse = {
  items: Environment[];
};

export type AgentInfo = {
  mode: "agent";
  agentVersion: string;
  dockerVersion?: string | null;
  dockerApiVersion?: string | null;
  dockerHost?: string | null;
};

export type EnvironmentMutationResponse = {
  environment: Environment;
  bootstrapToken?: string | null;
  installCommand?: string | null;
  setupUrl?: string | null;
};

export type EnvironmentTestResponse = {
  environment: Environment;
  info: AgentInfo;
};

export type EnvironmentSetupStatusResponse = {
  environment: Environment;
  agentState: EnvironmentRotationState;
  phase: EnvironmentSetupPhase;
  readyToComplete: boolean;
  setupUrl?: string | null;
  blockingReason?: EnvironmentSetupBlockingReason | null;
  lastError?: string | null;
};

export type EnvironmentOverview = {
  environment: Environment;
  connection: {
    mode: "local" | "remote";
    label: string;
  };
  containers: {
    available: boolean;
    total: number | null;
    running: number | null;
    stopped: number | null;
    healthy: number | null;
  };
};

export type EnvironmentOverviewResponse = {
  items: EnvironmentOverview[];
};

const API_PREFIX = "/api/environments";

export async function listEnvironments(): Promise<Environment[]> {
  const data = await http<EnvironmentListResponse>(API_PREFIX);
  return Array.isArray(data.items) ? data.items : [];
}

export async function listEnvironmentOverview(): Promise<EnvironmentOverview[]> {
  const data = await http<EnvironmentOverviewResponse>(`${API_PREFIX}/overview`);
  return Array.isArray(data.items) ? data.items : [];
}

export async function createRemoteEnvironment(body: {
  name: string;
  baseUrl: string;
}): Promise<EnvironmentMutationResponse> {
  return http<EnvironmentMutationResponse>(`${API_PREFIX}/remote`, {
    method: "POST",
    body,
  });
}

export async function updateRemoteEnvironment(
  id: string,
  body: { name?: string; baseUrl?: string },
): Promise<Environment> {
  return http<Environment>(`${API_PREFIX}/remote/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}

export async function testRemoteEnvironment(id: string): Promise<EnvironmentTestResponse> {
  return http<EnvironmentTestResponse>(`${API_PREFIX}/remote/${encodeURIComponent(id)}/test`, {
    method: "POST",
  });
}

export async function rotateRemoteEnvironmentToken(id: string): Promise<EnvironmentMutationResponse> {
  return http<EnvironmentMutationResponse>(
    `${API_PREFIX}/remote/${encodeURIComponent(id)}/rotate-token`,
    {
      method: "POST",
    },
  );
}

export async function getRemoteEnvironmentSetupStatus(
  id: string,
): Promise<EnvironmentSetupStatusResponse> {
  return http<EnvironmentSetupStatusResponse>(
    `${API_PREFIX}/remote/${encodeURIComponent(id)}/setup-status`,
  );
}

export async function completeRemoteEnvironmentSetup(
  id: string,
): Promise<{ environment: Environment }> {
  return http<{ environment: Environment }>(
    `${API_PREFIX}/remote/${encodeURIComponent(id)}/complete-setup`,
    {
      method: "POST",
    },
  );
}

export async function reportRemoteEnvironmentSetupTimeout(
  id: string,
  body: { flow?: "install" | "rotation"; lastError?: string },
): Promise<{ ok: boolean }> {
  return http<{ ok: boolean }>(`${API_PREFIX}/remote/${encodeURIComponent(id)}/setup-timeout`, {
    method: "POST",
    body,
  });
}

export async function getRemoteEnvironmentRotationStatus(
  id: string,
): Promise<EnvironmentSetupStatusResponse> {
  return getRemoteEnvironmentSetupStatus(id);
}

export async function completeRemoteEnvironmentRotation(
  id: string,
): Promise<{ environment: Environment }> {
  return completeRemoteEnvironmentSetup(id);
}

export async function deleteRemoteEnvironment(id: string): Promise<{ ok: boolean }> {
  return http<{ ok: boolean }>(`${API_PREFIX}/remote/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function buildEnvironmentPath(
  environmentId: string,
  section: "dashboard" | "jobs" | "scheduler" | "notifications",
) {
  return `/environments/${encodeURIComponent(environmentId)}/${section}`;
}
