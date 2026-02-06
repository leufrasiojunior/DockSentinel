import { http } from "./http";

export type DockerContainer = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  labels: Record<string, string>;
};

export type UpdateCheckResult = {
  hasUpdate: boolean;
  // Campos extras podem existir no backend — não travamos o frontend por isso
  [key: string]: unknown;
};

export function getAllowAutoUpdateFromLabels(labels: Record<string, string>) {
  // padrão do app: se docksentinel.update=false => bloqueia update
  const v = labels?.["docksentinel.update"];
  return v !== "false";
}

export async function listContainers(): Promise<DockerContainer[]> {
  // Pelo HANDOFF, isso é um ARRAY puro.
  return http<DockerContainer[]>("/docker/containers");
}

export async function getContainerDetails(id: string) {
  return http<any>(`/docker/containers/${encodeURIComponent(id)}`);
}

export async function updateCheck(name: string): Promise<UpdateCheckResult> {
  return http<UpdateCheckResult>(
    `/docker/containers/${encodeURIComponent(name)}/update-check`,
  );
}

export async function updateContainer(
  name: string,
  body: { pull: boolean; force: boolean },
): Promise<any> {
  return http<any>(`/docker/containers/${encodeURIComponent(name)}/update`, {
    method: "POST",
    body,
  });
}

export async function recreateContainer(name: string): Promise<any> {
  return http<any>(`/docker/containers/${encodeURIComponent(name)}/recreate`, {
    method: "POST",
  });
}

export async function recreatePlan(containerId: string): Promise<any> {
  return http<any>(
    `/docker/containers/${encodeURIComponent(containerId)}/recreate-plan`,
  );
}
