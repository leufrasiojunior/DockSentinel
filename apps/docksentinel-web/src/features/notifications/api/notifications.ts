import { http } from "../../../shared/api/http";

export type InAppNotification = {
  id: string;
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

export async function listNotifications(params?: {
  afterId?: string;
  take?: number;
}): Promise<NotificationsResponse> {
  const q = new URLSearchParams();
  if (params?.afterId) q.set("afterId", params.afterId);
  if (typeof params?.take === "number") q.set("take", String(params.take));

  const suffix = q.toString();
  const path = suffix ? `/api/notifications?${suffix}` : "/api/notifications";
  return http<NotificationsResponse>(path);
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return http<{ ok: boolean }>(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean; affected: number }> {
  return http<{ ok: boolean; affected: number }>("/api/notifications/read-all", {
    method: "POST",
  });
}
