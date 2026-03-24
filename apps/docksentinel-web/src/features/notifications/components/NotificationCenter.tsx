import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

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
import {
  markAllNotificationsReadInCache,
  markNotificationReadInCache,
  restoreNotificationsCache,
  snapshotNotificationsCache,
} from "../utils/cache";
import { sortNewestFirst } from "../utils/date";
import { formatDateTime } from "../../../i18n/format";

export function NotificationCenter() {
  const { t } = useTranslation();
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
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const snapshot = snapshotNotificationsCache(qc);
      markNotificationReadInCache(qc, id);
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      restoreNotificationsCache(qc, context?.snapshot);
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
        aria-label={t("notifications.center.openAria")}
        title={t("notifications.center.title")}
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 ? (
          <span
            key={unreadCount}
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background transition-transform duration-300 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 motion-safe:duration-300"
          >
            {unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <Card className="absolute right-0 top-12 z-50 w-[22rem] overflow-hidden border-border/70 bg-card/95 p-0 shadow-[0_30px_90px_-45px_rgba(8,13,24,0.75)] backdrop-blur-xl sm:w-[25rem]">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-foreground">{t("notifications.center.title")}</div>
              {unreadCount > 0 ? <Badge variant="info">{t("notifications.center.badgeNew", { count: unreadCount })}</Badge> : null}
            </div>
            <Link
              to="/notifications"
              className="inline-flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
              onClick={() => setOpen(false)}
            >
              {t("notifications.center.viewAll")} <ExternalLink className="size-3" />
            </Link>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto p-3">
            {notificationsQuery.isLoading ? (
              <div className="p-8 text-center text-xs italic text-muted-foreground">{t("notifications.center.loading")}</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs italic text-muted-foreground">
                {t("notifications.center.empty")}
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
                          {notification.level === "error" ? t("common.states.error") : t("common.states.info")}
                        </Badge>
                        <div className="truncate text-sm font-semibold text-foreground">{notification.title}</div>
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {notification.message}
                      </div>
                      <div className="mt-3 text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {formatDateTime(notification.createdAt) ?? notification.createdAt}
                      </div>
                    </div>

                    {!notification.readAt ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => markReadMutation.mutate(notification.id)}
                        disabled={markReadMutation.isPending}
                        title={t("notifications.center.markRead")}
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
                {t("notifications.center.markAllRead")}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
