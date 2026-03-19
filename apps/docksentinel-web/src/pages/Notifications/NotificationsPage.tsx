import { BellRing, Eye, Inbox, RefreshCcw, SendHorizontal } from "lucide-react";

import { PageHeader } from "../../components/product/page-header";
import { SectionCard } from "../../components/product/section-card";
import { StatCard } from "../../components/product/stat-card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { NotificationTable } from "../../features/notifications/components/NotificationTable";
import { useNotifications } from "../../features/notifications/hooks/useNotifications";

export function NotificationsPage() {
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
      <PageHeader
        eyebrow="Events"
        title="Notification Center"
        description="Histórico in-app em ordem cronológica decrescente, com leitura individual ou em lote."
        meta={
          <>
            <Badge variant="outline">{visible ? "Auto-refresh ON" : "Auto-refresh OFF"}</Badge>
            <Badge variant="outline">{unreadCount} não lidas</Badge>
          </>
        }
        actions={
          <Button type="button" onClick={() => refetch()} disabled={isFetching} variant="outline">
            <RefreshCcw className="size-4" />
            Recarregar
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={items.length} helper="Eventos recebidos do backend." icon={Inbox} />
        <StatCard label="Unread" value={unreadCount} helper="Aguardando leitura." icon={BellRing} tone="info" />
        <StatCard label="Read" value={items.length - unreadCount} helper="Já consolidadas na UI." icon={Eye} tone="success" />
        <StatCard label="Flow" value={visible ? "Live" : "Paused"} helper="Polling depende da visibilidade da aba." icon={SendHorizontal} tone="default" />
      </div>

      <SectionCard
        title={`Lista (${items.length})`}
        description={`Últimas notificações registradas pelo backend • não lidas: ${unreadCount}`}
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => markAllRead()}
            disabled={markAllReadPending || unreadCount === 0}
          >
            Marcar todas como lidas
          </Button>
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
