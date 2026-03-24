import { BellRing, Eye, Inbox, RefreshCcw, SendHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "../../components/product/section-card";
import { StatCard } from "../../components/product/stat-card";
import { Button } from "../../components/ui/button";
import { NotificationTable } from "../../features/notifications/components/NotificationTable";
import { useNotifications } from "../../features/notifications/hooks/useNotifications";

export function NotificationsPage() {
  const { t } = useTranslation();
  const {
    items,
    unreadCount,
    loading,
    isFetching,
    refetch,
    markRead,
    markReadPending,
    markAllRead,
    markAllReadPending,
    visible,
  } = useNotifications();

  return (
    <div className="space-y-6">


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("common.labels.total")} value={items.length} helper={t("notifications.stats.totalHelper")} icon={Inbox} />
        <StatCard label={t("notifications.stats.unreadLabel")} value={unreadCount} helper={t("notifications.stats.unreadHelper")} icon={BellRing} tone="info" />
        <StatCard label={t("notifications.stats.readLabel")} value={items.length - unreadCount} helper={t("notifications.stats.readHelper")} icon={Eye} tone="success" />
        <StatCard label={t("common.labels.flow")} value={visible ? t("notifications.flowLive") : t("notifications.flowPaused")} helper={t("notifications.stats.flowHelper")} icon={SendHorizontal} tone="default" />
      </div>

      <SectionCard
        title={t("notifications.sectionTitle", { count: items.length })}
        description={t("notifications.sectionDescription", { count: unreadCount })}
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCcw className="size-4" />
              {t("common.actions.reload")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => markAllRead()}
              disabled={markAllReadPending || unreadCount === 0}
            >
              {t("common.actions.markAllAsRead")}
            </Button>
          </>
        }
      >
        <div className="-mx-6">
          <NotificationTable
            items={items}
            loading={loading}
            onMarkRead={markRead}
            markReadPending={markReadPending}
          />
        </div>
      </SectionCard>
    </div>
  );
}
