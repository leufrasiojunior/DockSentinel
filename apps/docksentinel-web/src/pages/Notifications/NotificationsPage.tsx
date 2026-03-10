import { Card, CardHeader } from "../../shared/components/ui/Card";
import { Button } from "../../shared/components/ui/Button";
import { useNotifications } from "../../features/notifications/hooks/useNotifications";
import { NotificationTable } from "../../features/notifications/components/NotificationTable";

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
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notificações</h1>
          <p className="mt-1 text-sm text-gray-600">
            Histórico das notificações in-app (ordem: mais novas primeiro • auto-refresh: {visible ? "ON" : "OFF"}).
          </p>
        </div>

        <Button type="button" onClick={() => refetch()} disabled={isFetching}>
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
            onClick={() => markAllRead()}
            disabled={markAllReadPending || unreadCount === 0}
          >
            Marcar todas como lidas
          </Button>
        </div>

        <NotificationTable
          items={items}
          loading={loading}
          onMarkRead={markRead}
          markReadPending={markReadPending}
        />
      </Card>
    </div>
  );
}
