import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Copy, ExternalLink } from "lucide-react";
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
import { useEnvironmentRoute } from "../../environments/hooks/useEnvironmentRoute";
import { listEnvironments, type Environment } from "../../environments/api/environments";
import { isAgentOutdated } from "../../settings/api/settings";
import { useVersionCheck } from "../../settings/hooks/useVersionCheck";
import { copyToClipboard } from "../../../shared/lib/utils/copyToClipboard";
import { useToast } from "../../../shared/components/ui/ToastProvider";

export function NotificationCenter() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const visible = usePageVisibility();
  const { environmentId } = useEnvironmentRoute();
  const { versionCheck } = useVersionCheck();
  const [open, setOpen] = useState(false);
  const [copiedEnvId, setCopiedEnvId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const environmentsQuery = useQuery<Environment[]>({
    queryKey: ["environments"],
    queryFn: listEnvironments,
    staleTime: 60_000,
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", environmentId, "panel"],
    queryFn: () => listNotifications({ environmentId, take: 5 }),
    refetchInterval: visible ? 5_000 : false,
    retry: false,
  });

  const outdatedAgents = useMemo(() => {
    if (!versionCheck?.agent.latestVersion) return [];
    const envs = environmentsQuery.data ?? [];
    return envs.filter(
      (env) =>
        env.kind === "remote" &&
        isAgentOutdated(env.agentVersion, versionCheck.agent.latestVersion),
    );
  }, [environmentsQuery.data, versionCheck?.agent.latestVersion]);

  const notifications = useMemo(
    () => sortNewestFirst(notificationsQuery.data?.items ?? []),
    [notificationsQuery.data?.items],
  );
  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const totalAlerts = unreadCount + outdatedAgents.length;

  async function handleCopyAgentCommand(envId: string, command: string) {
    try {
      await copyToClipboard(command);
      setCopiedEnvId(envId);
      toast.success(t("updatesCheck.agentUpdateCommandCopied"));
      setTimeout(() => setCopiedEnvId(null), 3000);
    } catch {
      toast.error("Falha ao copiar comando para a área de transferência");
    }
  }

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => markNotificationRead(environmentId, id),
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
    mutationFn: async () => markAllNotificationsRead(environmentId),
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
        {totalAlerts > 0 ? (
          <span
            key={totalAlerts}
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background transition-transform duration-300 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 motion-safe:duration-300"
          >
            {totalAlerts}
          </span>
        ) : null}
      </Button>

      {open ? (
        <Card className="absolute right-0 top-12 z-50 w-[22rem] overflow-hidden border-border/70 bg-card/95 p-0 shadow-[0_30px_90px_-45px_rgba(8,13,24,0.75)] backdrop-blur-xl sm:w-[25rem]">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-foreground">{t("notifications.center.title")}</div>
              {totalAlerts > 0 ? <Badge variant="info">{t("notifications.center.badgeNew", { count: totalAlerts })}</Badge> : null}
            </div>
            <Link
              to={`/environments/${encodeURIComponent(environmentId)}/notifications`}
              className="inline-flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
              onClick={() => setOpen(false)}
            >
              {t("notifications.center.viewAll")} <ExternalLink className="size-3" />
            </Link>
          </div>

          <div className="max-h-[420px] space-y-2.5 overflow-y-auto p-3">
            {/* Outdated Agents Notification Cards */}
            {outdatedAgents.map((env) => (
              <div
                key={`agent-update-${env.id}`}
                className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-amber-950/20 p-3.5 shadow-sm space-y-2.5 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="relative flex size-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                    </span>
                    <span className="text-[0.68rem] font-bold uppercase tracking-wider text-amber-300 truncate">
                      {t("updatesCheck.agentUpdateAvailableBadge")} · {env.name}
                    </span>
                  </div>
                  <Badge variant="warning" className="text-[0.62rem] shrink-0 font-mono">
                    v{versionCheck?.agent.latestVersion}
                  </Badge>
                </div>

                <p className="text-xs text-foreground/85 leading-relaxed">
                  {t("updatesCheck.agentUpdateNotificationDesc", {
                    env: env.name,
                    current: env.agentVersion ?? "—",
                    latest: versionCheck?.agent.latestVersion,
                  })}
                </p>

                {versionCheck?.agent.updateCommand ? (
                  <div className="flex items-center gap-2 pt-0.5">
                    <Button
                      type="button"
                      size="xs"
                      variant="highlight"
                      onClick={() => handleCopyAgentCommand(env.id, versionCheck.agent.updateCommand)}
                      className="rounded-xl gap-1.5 text-xs font-semibold h-7 px-2.5 shadow-sm"
                    >
                      {copiedEnvId === env.id ? (
                        <>
                          <Check className="size-3.5 text-emerald-600" />
                          <span>{t("common.actions.copied")}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5 text-violet-600" />
                          <span>{t("updatesCheck.copyUpdateCommand")}</span>
                        </>
                      )}
                    </Button>

                    <a
                      href={versionCheck.agent.releaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[0.68rem] text-muted-foreground hover:text-amber-300 transition-colors"
                    >
                      Release notes <ExternalLink className="size-3" />
                    </a>
                  </div>
                ) : null}
              </div>
            ))}

            {notificationsQuery.isLoading ? (
              <div className="p-8 text-center text-xs italic text-muted-foreground">{t("notifications.center.loading")}</div>
            ) : notifications.length === 0 && outdatedAgents.length === 0 ? (
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
