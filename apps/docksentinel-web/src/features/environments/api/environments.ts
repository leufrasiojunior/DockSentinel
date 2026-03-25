import { http } from "../../../shared/api/http";

export type EnvironmentKind = "local" | "remote";
export type EnvironmentStatus = "online" | "offline";

export type Environment = {
  id: string;
  kind: EnvironmentKind;
  name: string;
  baseUrl?: string | null;
  hasToken: boolean;
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
  agentToken: string;
  installCommand: string;
};

export type EnvironmentTestResponse = {
  environment: Environment;
  info: AgentInfo;
};

const API_PREFIX = "/api/environments";

export async function listEnvironments(): Promise<Environment[]> {
  const data = await http<EnvironmentListResponse>(API_PREFIX);
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
