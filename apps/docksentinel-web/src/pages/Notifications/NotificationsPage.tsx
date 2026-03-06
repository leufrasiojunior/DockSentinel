import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications";
import { usePageVisibility } from "../../hooks/usePageVisibility";
import { Card, CardHeader } from "../../shared/components/ui/Card";
import { Button } from "../../shared/components/ui/Button";

function fmt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function toEpoch(value: string) {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

function sortNewestFirst<T extends { id: string; createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const dateDiff = toEpoch(b.createdAt) - toEpoch(a.createdAt);
    if (dateDiff !== 0) return dateDiff;
    return b.id.localeCompare(a.id);
  });
}

export function NotificationsPage() {
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notificações</h1>
          <p className="mt-1 text-sm text-gray-600">
            Histórico das notificações in-app (ordem: mais novas primeiro • auto-refresh: {visible ? "ON" : "OFF"}).
          </p>
        </div>

        <Button type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
          Recarregar
        </Button>
      </div>

      <Card>
        <CardHeader
          title={`Lista (${items.length})`}
          subtitle={`Últimas notificações registradas pelo backend • não lidas: ${unreadCount}`}
        />

        <div className="px-4 pb-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || unreadCount === 0}
          >
            Marcar todas como lidas
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Mensagem</th>
                <th className="px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {query.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-gray-600">
                    Carregando...
                  </td>
                </tr>
              )}

              {!query.isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-gray-600">
                    Nenhuma notificação encontrada.
                  </td>
                </tr>
              )}

              {items.map((n) => (
                <tr
                  key={n.id}
                  className={[
                    "hover:bg-gray-50",
                    !n.readAt ? "bg-blue-50/30" : "",
                  ].join(" ")}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(n.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        n.level === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700",
                      ].join(" ")}
                    >
                      {n.level === "error" ? "ERRO" : "INFO"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {n.readAt ? (
                      <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">Lida</span>
                    ) : (
                      <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">Não lida</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{n.title}</td>
                  <td className="px-4 py-3 text-gray-700">{n.message}</td>
                  <td className="px-4 py-3">
                    {!n.readAt && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => markReadMutation.mutate(n.id)}
                        disabled={markReadMutation.isPending}
                      >
                        Marcar lida
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
