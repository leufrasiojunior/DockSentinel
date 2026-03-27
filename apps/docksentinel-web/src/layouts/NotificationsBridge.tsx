import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listNotifications } from "../features/notifications/api/notifications";
import { usePageVisibility } from "../hooks/usePageVisibility";
import { useToast } from "../shared/components/ui/ToastProvider";
import { useEnvironmentRoute } from "../features/environments/hooks/useEnvironmentRoute";

export function NotificationsBridge() {
  const toast = useToast();
  const visible = usePageVisibility();
  const { environmentId } = useEnvironmentRoute();

  const seenRef = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["notifications", environmentId, "in-app", "latest"],
    queryFn: () => listNotifications({ environmentId, take: 25 }),
    refetchInterval: visible ? 5_000 : false,
    retry: false,
  });

  useEffect(() => {
    const items = query.data?.items ?? [];
    if (items.length === 0) return;

    const now = Date.now();

    for (const item of items) {
      if (seenRef.current.has(item.id)) continue;
      seenRef.current.add(item.id);

      // No primeiro carregamento, só mostra itens recentes para evitar spam histórico.
      const createdAt = Date.parse(item.createdAt);
      const isRecent = Number.isFinite(createdAt) ? now - createdAt <= 2 * 60 * 1000 : false;
      if (!isRecent && seenRef.current.size <= items.length) continue;

      if (item.level === "error") toast.error(item.message, item.title);
      else toast.success(item.message, item.title);
    }
  }, [query.data, toast]);

  return null;
}
