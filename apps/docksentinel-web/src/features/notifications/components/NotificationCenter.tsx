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
import { cn } from "../../../shared/lib/utils/cn";
import { Bell, Check, ExternalLink } from "lucide-react";

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
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200",
          open 
            ? "bg-muted border-border text-foreground shadow-inner" 
            : "bg-background border-border text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
        )}
        aria-label="Abrir central de notificações"
        title="Central de notificações"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-background">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-xl border border-border bg-card p-0 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              Notificações
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-600 dark:text-blue-400">
                  {unreadCount} novas
                </span>
              )}
            </div>
            <Link
              to="/notifications"
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              onClick={() => setOpen(false)}
            >
              Ver todas <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2 space-y-1 scrollbar-hide">
            {notificationsQuery.isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                Nenhuma notificação encontrada.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "group relative rounded-lg border border-transparent p-3 transition-colors",
                    !n.readAt 
                      ? "bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/10" 
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            n.level === "error" ? "bg-red-500" : "bg-green-500",
                            n.readAt && "opacity-40"
                          )}
                        />
                        <div className={cn(
                          "text-xs font-semibold truncate",
                          !n.readAt ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {n.title}
                        </div>
                      </div>
                      <div className={cn(
                        "text-xs line-clamp-2 leading-relaxed",
                        !n.readAt ? "text-foreground/90" : "text-muted-foreground/80"
                      )}>
                        {n.message}
                      </div>
                      <div className="mt-2 text-[10px] text-muted-foreground/60 flex items-center gap-2">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {!n.readAt && (
                      <button
                        type="button"
                        className="rounded-full p-1.5 text-muted-foreground hover:bg-blue-500/20 hover:text-blue-600 transition-colors"
                        onClick={() => markReadMutation.mutate(n.id)}
                        disabled={markReadMutation.isPending}
                        title="Marcar como lida"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {unreadCount > 0 && (
            <div className="border-t border-border bg-muted/30 p-2">
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="w-full rounded-md py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                Marcar todas como lidas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
