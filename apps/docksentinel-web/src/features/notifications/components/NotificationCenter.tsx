import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ExternalLink } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { usePageVisibility } from "../../../hooks/usePageVisibility";
import { cn } from "../../../shared/lib/utils/cn";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
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
      <Button
        type="button"
        onClick={() => setOpen((value) => !value)}
        variant="outline"
        size="icon-sm"
        className={cn(
          "relative rounded-full border-border/70 bg-card/75 text-muted-foreground hover:bg-accent/70 hover:text-foreground",
          open && "bg-accent text-foreground",
        )}
        aria-label="Abrir central de notificações"
        title="Central de notificações"
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
            {unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <Card className="absolute right-0 top-12 z-50 w-[22rem] overflow-hidden border-border/70 bg-card/95 p-0 shadow-[0_30px_90px_-45px_rgba(8,13,24,0.75)] backdrop-blur-xl sm:w-[25rem]">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-foreground">Notificações</div>
              {unreadCount > 0 ? <Badge variant="info">{unreadCount} novas</Badge> : null}
            </div>
            <Link
              to="/notifications"
              className="inline-flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
              onClick={() => setOpen(false)}
            >
              Ver todas <ExternalLink className="size-3" />
            </Link>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto p-3">
            {notificationsQuery.isLoading ? (
              <div className="p-8 text-center text-xs italic text-muted-foreground">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs italic text-muted-foreground">
                Nenhuma notificação encontrada.
              </div>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "border-border/60 bg-card/70 p-4 transition-colors",
                    !notification.readAt && "border-primary/15 bg-primary/6",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={notification.level === "error" ? "destructive" : "success"}>
                          {notification.level === "error" ? "ERRO" : "INFO"}
                        </Badge>
                        <div className="truncate text-sm font-semibold text-foreground">{notification.title}</div>
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {notification.message}
                      </div>
                      <div className="mt-3 text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {!notification.readAt ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => markReadMutation.mutate(notification.id)}
                        disabled={markReadMutation.isPending}
                        title="Marcar como lida"
                        className="rounded-full"
                      >
                        <Check className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </Card>
              ))
            )}
          </div>

          {unreadCount > 0 ? (
            <div className="border-t border-border/60 bg-muted/30 p-3">
              <Button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                variant="outline"
                className="w-full"
              >
                Marcar todas como lidas
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
