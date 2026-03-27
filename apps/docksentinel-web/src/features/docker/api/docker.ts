import { http } from "../../../shared/api/http";

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

function path(environmentId: string, suffix: string) {
  return `/api/environments/${encodeURIComponent(environmentId)}${suffix}`;
}

export async function listContainers(environmentId: string): Promise<DockerContainer[]> {
  return http<DockerContainer[]>(path(environmentId, "/docker/containers"));
}

export async function getContainerDetails(environmentId: string, id: string) {
  return http<any>(path(environmentId, `/docker/containers/${encodeURIComponent(id)}`));
}

export async function updateCheck(
  environmentId: string,
  name: string,
): Promise<UpdateCheckResult> {
  return http<UpdateCheckResult>(
    path(environmentId, `/docker/containers/${encodeURIComponent(name)}/update-check`),
  );
}

export async function updateContainer(
  environmentId: string,
  name: string,
  body: { pull: boolean; force: boolean },
): Promise<any> {
  return http<any>(path(environmentId, `/docker/containers/${encodeURIComponent(name)}/update`), {
    method: "POST",
    body,
  });
}

export async function recreateContainer(environmentId: string, name: string): Promise<any> {
  return http<any>(path(environmentId, `/docker/containers/${encodeURIComponent(name)}/recreate`), {
    method: "POST",
  });
}

export async function recreatePlan(environmentId: string, containerId: string): Promise<any> {
  return http<any>(
    path(environmentId, `/docker/containers/${encodeURIComponent(containerId)}/recreate-plan`),
  );
}
