import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteNotification,
  deleteNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "../api/notifications";
import { usePageVisibility } from "../../../hooks/usePageVisibility";
import {
  deleteNotificationInCache,
  deleteNotificationsInCache,
  markAllNotificationsReadInCache,
  markNotificationReadInCache,
  markNotificationUnreadInCache,
  restoreNotificationsCache,
  snapshotNotificationsCache,
} from "../utils/cache";
import { sortNewestFirst } from "../utils/date";

export function useNotifications() {
  const visible = usePageVisibility();
  const qc = useQueryClient();
  const [markReadPendingId, setMarkReadPendingId] = useState<string | null>(null);
  const [markUnreadPendingId, setMarkUnreadPendingId] = useState<string | null>(null);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: () => listNotifications({ take: 100 }),
    refetchInterval: visible ? 5_000 : false,
    retry: false,
  });

  const items = useMemo(() => sortNewestFirst(query.data?.items ?? []), [query.data?.items]);
  const unreadCount = items.filter((n) => !n.readAt).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => markNotificationRead(id),
    onMutate: async (id: string) => {
      setMarkReadPendingId(id);
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const snapshot = snapshotNotificationsCache(qc);
      markNotificationReadInCache(qc, id);
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      restoreNotificationsCache(qc, context?.snapshot);
    },
    onSettled: () => {
      setMarkReadPendingId(null);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => markAllNotificationsRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const snapshot = snapshotNotificationsCache(qc);
      markAllNotificationsReadInCache(qc);
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      restoreNotificationsCache(qc, context?.snapshot);
    },
  });

  const markUnreadMutation = useMutation({
    mutationFn: async (id: string) => markNotificationUnread(id),
    onMutate: async (id: string) => {
      setMarkUnreadPendingId(id);
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const snapshot = snapshotNotificationsCache(qc);
      markNotificationUnreadInCache(qc, id);
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      restoreNotificationsCache(qc, context?.snapshot);
    },
    onSettled: () => {
      setMarkUnreadPendingId(null);
    },
  });

  const deleteOneMutation = useMutation({
    mutationFn: async (id: string) => deleteNotification(id),
    onMutate: async (id: string) => {
      setDeletePendingId(id);
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const snapshot = snapshotNotificationsCache(qc);
      deleteNotificationInCache(qc, id);
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      restoreNotificationsCache(qc, context?.snapshot);
    },
    onSettled: () => {
      setDeletePendingId(null);
    },
  });

  const deleteManyMutation = useMutation({
    mutationFn: async (ids: string[]) => deleteNotifications(ids),
    onMutate: async (ids: string[]) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const snapshot = snapshotNotificationsCache(qc);
      deleteNotificationsInCache(qc, ids);
      return { snapshot };
    },
    onError: (_error, _ids, context) => {
      restoreNotificationsCache(qc, context?.snapshot);
    },
  });

  return {
    items,
    unreadCount,
    loading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    markRead: markReadMutation.mutate,
    markReadPending: markReadMutation.isPending,
    markReadPendingId,
    markUnread: markUnreadMutation.mutate,
    markUnreadPending: markUnreadMutation.isPending,
    markUnreadPendingId,
    markAllRead: markAllReadMutation.mutate,
    markAllReadPending: markAllReadMutation.isPending,
    deleteOne: deleteOneMutation.mutate,
    deleteOnePending: deleteOneMutation.isPending,
    deletePendingId,
    deleteMany: deleteManyMutation.mutate,
    deleteManyPending: deleteManyMutation.isPending,
    visible,
  };
}
