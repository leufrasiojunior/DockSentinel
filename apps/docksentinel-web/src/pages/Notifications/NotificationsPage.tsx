import { useEffect, useState } from "react";
import { BellRing, Eye, Inbox, LoaderCircle, RefreshCcw, SendHorizontal, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "../../components/product/section-card";
import { StatCard } from "../../components/product/stat-card";
import { Button } from "../../components/ui/button";
import { NotificationTable } from "../../features/notifications/components/NotificationTable";
import { useNotifications } from "../../features/notifications/hooks/useNotifications";
import { useConfirm } from "../../shared/components/ui/ConfirmProvider";

export function NotificationsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const {
    items,
    unreadCount,
    loading,
    isFetching,
    refetch,
    markRead,
    markReadPendingId,
    markUnread,
    markUnreadPendingId,
    markAllRead,
    markAllReadPending,
    deleteOne,
    deletePendingId,
    deleteMany,
    deleteManyPending,
    visible,
  } = useNotifications();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const currentIds = new Set(items.map((item) => item.id));
    setSelectedIds((current) => current.filter((id) => currentIds.has(id)));
  }, [items]);

  const selectedCount = selectedIds.length;
  const allSelected = items.length > 0 && selectedCount === items.length;

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function toggleAllSelected(checked: boolean) {
    setSelectedIds(checked ? items.map((item) => item.id) : []);
  }

  async function handleDeleteOne(id: string) {
    const ok = await confirm.confirm({
      title: t("notifications.confirm.deleteOneTitle"),
      description: t("notifications.confirm.deleteOneDescription"),
      confirmText: t("common.actions.delete"),
      danger: true,
    });

    if (!ok) return;
    deleteOne(id);
  }

  async function handleDeleteSelected() {
    const ok = await confirm.confirm({
      title: t("notifications.confirm.deleteManyTitle", { count: selectedCount }),
      description: t("notifications.confirm.deleteManyDescription", { count: selectedCount }),
      confirmText: t("common.actions.delete"),
      danger: true,
    });

    if (!ok) return;
    deleteMany(selectedIds);
  }

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
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCcw className={isFetching ? "size-4 animate-spin" : "size-4"} />
              {t("common.actions.reload")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => markAllRead()}
              disabled={markAllReadPending || unreadCount === 0}
            >
              {markAllReadPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {t("common.actions.markAllAsRead")}
            </Button>
            {selectedCount > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => void handleDeleteSelected()}
                disabled={deleteManyPending}
              >
                {deleteManyPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {t("notifications.table.deleteSelected", { count: selectedCount })}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="-mx-6">
          <NotificationTable
            items={items}
            loading={loading}
            selectedIds={selectedIds}
            allSelected={allSelected}
            onToggleSelected={toggleSelected}
            onToggleAllSelected={toggleAllSelected}
            onMarkRead={markRead}
            onMarkUnread={markUnread}
            onDelete={handleDeleteOne}
            markReadPendingId={markReadPendingId}
            markUnreadPendingId={markUnreadPendingId}
            deletePendingId={deletePendingId}
            deleteManyPending={deleteManyPending}
          />
        </div>
      </SectionCard>
    </div>
  );
}
