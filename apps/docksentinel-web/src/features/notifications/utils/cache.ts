import type { QueryClient } from "@tanstack/react-query";
import type { InAppNotification, NotificationsResponse } from "../api/notifications";

type NotificationsSnapshot = Array<[readonly unknown[], NotificationsResponse | undefined]>;

const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

function updateNotificationsCache(
  qc: QueryClient,
  updater: (items: InAppNotification[]) => InAppNotification[],
) {
  qc.setQueriesData<NotificationsResponse>({ queryKey: NOTIFICATIONS_QUERY_KEY }, (current) => {
    if (!current) return current;
    return {
      ...current,
      items: updater(current.items),
    };
  });
}

export function snapshotNotificationsCache(qc: QueryClient): NotificationsSnapshot {
  return qc.getQueriesData<NotificationsResponse>({ queryKey: NOTIFICATIONS_QUERY_KEY });
}

export function restoreNotificationsCache(qc: QueryClient, snapshot?: NotificationsSnapshot) {
  if (!snapshot) return;
  snapshot.forEach(([queryKey, data]) => {
    qc.setQueryData(queryKey, data);
  });
}

export function markNotificationReadInCache(qc: QueryClient, id: string) {
  const now = new Date().toISOString();
  updateNotificationsCache(qc, (items) =>
    items.map((item) =>
      item.id === id
        ? {
            ...item,
            readAt: item.readAt ?? now,
          }
        : item,
    ),
  );
}

export function markNotificationUnreadInCache(qc: QueryClient, id: string) {
  updateNotificationsCache(qc, (items) =>
    items.map((item) =>
      item.id === id
        ? {
            ...item,
            readAt: null,
          }
        : item,
    ),
  );
}

export function markAllNotificationsReadInCache(qc: QueryClient) {
  const now = new Date().toISOString();
  updateNotificationsCache(qc, (items) =>
    items.map((item) =>
      item.readAt
        ? item
        : {
            ...item,
            readAt: now,
          },
    ),
  );
}

export function deleteNotificationInCache(qc: QueryClient, id: string) {
  updateNotificationsCache(qc, (items) => items.filter((item) => item.id !== id));
}

export function deleteNotificationsInCache(qc: QueryClient, ids: string[]) {
  const idsSet = new Set(ids);
  updateNotificationsCache(qc, (items) => items.filter((item) => !idsSet.has(item.id)));
}
