import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import { usePageVisibility } from "../../../hooks/usePageVisibility";
import { sortNewestFirst } from "../utils/date";

export function NotificationCenter() {
  const qc = useQueryClient();
  const visible = usePageVisibility();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "panel"],
    queryFn: () => listNotifications({ take: 5 }),
    refetchInterval: visible ? 5_000 : false,
    retry: false,
  });

  const notifications = useMemo(
    () => sortNewestFirst(notificationsQuery.data?.items ?? []),
    [notificationsQuery.data?.items],
  );
  const unreadCount = notifications.filter((n) => !n.readAt).length;

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

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        setOpen(false);
      }
    }

    if (!open) return;
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative flex items-center gap-2" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white text-gray-700 shadow-sm hover:bg-gray-50"
        aria-label="Abrir central de notificações"
        title="Central de notificações"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[430px] rounded-xl border bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800">
              Central de notificações
            </div>
            <Link
              to="/notifications"
              className="text-xs text-blue-600 hover:text-blue-700"
              onClick={() => setOpen(false)}
            >
              Ver todas
            </Link>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
            <span>Não lidas: {unreadCount} • Mais novas primeiro</span>
            <button
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || unreadCount === 0}
              className="rounded border px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
            >
              Marcar todas como lidas
            </button>
          </div>

          <div className="max-h-96 space-y-2 overflow-auto pr-1">
            {notificationsQuery.isLoading && (
              <div className="rounded-md border bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Carregando...
              </div>
            )}

            {!notificationsQuery.isLoading && notifications.length === 0 && (
              <div className="rounded-md border bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Nenhuma notificação.
              </div>
            )}

            {notifications.map((n) => (
              <div
                key={n.id}
                className={[
                  "rounded-md border px-3 py-2",
                  !n.readAt ? "border-blue-200 bg-blue-50/40" : "border-gray-200",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-semibold text-gray-800">{n.title}</div>
                  <div className="flex items-center gap-2">
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
                    {!n.readAt && (
                      <button
                        type="button"
                        className="rounded border px-1.5 py-0.5 text-[10px] hover:bg-white"
                        onClick={() => markReadMutation.mutate(n.id)}
                        disabled={markReadMutation.isPending}
                      >
                        Lida
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1 line-clamp-3 text-xs text-gray-700">{n.message}</div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
