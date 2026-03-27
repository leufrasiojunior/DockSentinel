import { http } from "../../../shared/api/http";

export type InAppNotification = {
  id: string;
  environmentId: string;
  environmentName: string;
  channel: "in_app";
  type: "job_success" | "job_failed" | "scan_info" | "scan_error" | "system_error";
  level: "info" | "error";
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  meta?: Record<string, unknown>;
};

export type NotificationsResponse = {
  items: InAppNotification[];
};

function environmentPath(environmentId: string, suffix = "") {
  return `/api/environments/${encodeURIComponent(environmentId)}/notifications${suffix}`;
}

export async function listNotifications(params?: {
  environmentId?: string;
  afterId?: string;
  take?: number;
}): Promise<NotificationsResponse> {
  const q = new URLSearchParams();
  if (params?.afterId) q.set("afterId", params.afterId);
  if (typeof params?.take === "number") q.set("take", String(params.take));

  const suffix = q.toString();
  const path = suffix
    ? `${environmentPath(params?.environmentId ?? "local")}?${suffix}`
    : environmentPath(params?.environmentId ?? "local");
  return http<NotificationsResponse>(path);
}

export async function markNotificationRead(
  environmentId: string,
  id: string,
): Promise<{ ok: boolean }> {
  return http<{ ok: boolean }>(environmentPath(environmentId, `/${encodeURIComponent(id)}/read`), {
    method: "POST",
  });
}

export async function markNotificationUnread(
  environmentId: string,
  id: string,
): Promise<{ ok: boolean }> {
  return http<{ ok: boolean }>(environmentPath(environmentId, `/${encodeURIComponent(id)}/unread`), {
    method: "POST",
  });
}

export async function markAllNotificationsRead(
  environmentId: string,
): Promise<{ ok: boolean; affected: number }> {
  return http<{ ok: boolean; affected: number }>(environmentPath(environmentId, "/read-all"), {
    method: "POST",
  });
}

export async function deleteNotification(
  environmentId: string,
  id: string,
): Promise<{ ok: boolean }> {
  return http<{ ok: boolean }>(environmentPath(environmentId, `/${encodeURIComponent(id)}`), {
    method: "DELETE",
  });
}

export async function deleteNotifications(
  environmentId: string,
  ids: string[],
): Promise<{ ok: boolean; affected: number }> {
  return http<{ ok: boolean; affected: number }>(environmentPath(environmentId, "/delete-many"), {
    method: "POST",
    body: { ids },
  });
}
