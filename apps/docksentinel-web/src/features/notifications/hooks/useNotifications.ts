import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import { usePageVisibility } from "../../../hooks/usePageVisibility";
import { sortNewestFirst } from "../utils/date";

export function useNotifications() {
  const visible = usePageVisibility();
  const qc = useQueryClient();

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
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => markAllNotificationsRead(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
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
    markAllRead: markAllReadMutation.mutate,
    markAllReadPending: markAllReadMutation.isPending,
    visible,
  };
}
