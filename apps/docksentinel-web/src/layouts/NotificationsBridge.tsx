import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listNotifications } from "../features/notifications/api/notifications";
import { usePageVisibility } from "../hooks/usePageVisibility";
import { useToast } from "../shared/components/ui/ToastProvider";
import { useEnvironmentRoute } from "../features/environments/hooks/useEnvironmentRoute";

const MAX_TOASTS_PER_POLL = 2;

export function NotificationsBridge() {
  const toast = useToast();
  const visible = usePageVisibility();
  const { environmentId } = useEnvironmentRoute();

  const seenByEnvRef = useRef<Map<string, Set<string>>>(new Map());
  const initializedEnvsRef = useRef<Set<string>>(new Set());
  const baselineTimeByEnvRef = useRef<Map<string, number>>(new Map());

  const query = useQuery({
    queryKey: ["notifications", environmentId, "in-app", "latest"],
    queryFn: () => listNotifications({ environmentId, take: 25 }),
    refetchInterval: visible ? 5_000 : false,
    retry: false,
  });

  useEffect(() => {
    if (!query.isSuccess || !query.data) return;

    const items = query.data.items ?? [];
    let seenSet = seenByEnvRef.current.get(environmentId);
    if (!seenSet) {
      seenSet = new Set<string>();
      seenByEnvRef.current.set(environmentId, seenSet);
    }

    const maxItemEpoch = items.reduce((max, item) => {
      const parsed = Date.parse(item.createdAt);
      return Number.isFinite(parsed) && parsed > max ? parsed : max;
    }, Date.now());

    // Na primeira carga de cada ambiente, apenas indexamos o histórico existente
    // sem disparar toasts na tela ao navegar entre ambientes.
    if (!initializedEnvsRef.current.has(environmentId)) {
      for (const item of items) {
        seenSet.add(item.id);
      }
      initializedEnvsRef.current.add(environmentId);
      baselineTimeByEnvRef.current.set(environmentId, maxItemEpoch);
      return;
    }

    const baselineEpoch = baselineTimeByEnvRef.current.get(environmentId) ?? 0;
    const freshUnread = [];

    for (const item of items) {
      if (seenSet.has(item.id)) continue;
      seenSet.add(item.id);

      if (item.readAt) continue;

      const createdAt = Date.parse(item.createdAt);
      // Ignora itens antigos que apenas entraram na janela de 25 após exclusão de outros
      if (Number.isFinite(createdAt) && createdAt < baselineEpoch - 5_000) {
        continue;
      }

      freshUnread.push(item);
    }

    if (maxItemEpoch > baselineEpoch) {
      baselineTimeByEnvRef.current.set(environmentId, maxItemEpoch);
    }

    if (freshUnread.length === 0) return;

    const toDisplay = freshUnread
      .slice(0, MAX_TOASTS_PER_POLL)
      .reverse();

    for (const item of toDisplay) {
      if (item.level === "error") toast.error(item.message, item.title);
      else toast.success(item.message, item.title);
    }
  }, [environmentId, query.data, query.isSuccess, toast]);

  return null;
}
