import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/components/ui/Button";
import { Badge } from "../../../shared/components/ui/Badge";
import { formatDateTime } from "../../../i18n/format";
import { type InAppNotification } from "../api/notifications";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { cn } from "../../../shared/lib/utils/cn";

function fmt(value: string) {
  return formatDateTime(value) ?? value;
}

interface NotificationTableProps {
  items: InAppNotification[];
  loading: boolean;
  onMarkRead: (id: string) => void;
  markReadPending: boolean;
}

export function NotificationTable({
  items,
  loading,
  onMarkRead,
  markReadPending,
}: NotificationTableProps) {
  const { t } = useTranslation();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-left">{t("notifications.table.when")}</TableHead>
          <TableHead className="text-left">{t("notifications.table.type")}</TableHead>
          <TableHead className="text-left">{t("notifications.table.status")}</TableHead>
          <TableHead className="text-left">{t("notifications.table.title")}</TableHead>
          <TableHead className="text-left">{t("notifications.table.message")}</TableHead>
          <TableHead className="text-left">{t("notifications.table.action")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {t("notifications.table.loading")}
              </TableCell>
            </TableRow>
          )}

        {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {t("notifications.table.empty")}
              </TableCell>
            </TableRow>
          )}

        {items.map((n) => (
          <TableRow
            key={n.id}
            className={cn(
              "hover:bg-muted/50",
              !n.readAt && "bg-blue-500/5 dark:bg-blue-500/10"
            )}
          >
            <TableCell className="whitespace-nowrap text-left text-muted-foreground">{fmt(n.createdAt)}</TableCell>
            <TableCell className="text-left">
              <Badge tone={n.level === "error" ? "red" : "green"}>
                {n.level === "error" ? t("common.states.error") : t("common.states.info")}
              </Badge>
            </TableCell>
            <TableCell className="text-left text-xs">
              {n.readAt ? (
                <Badge tone="gray">{t("common.states.read")}</Badge>
              ) : (
                <Badge tone="blue">{t("common.states.unread")}</Badge>
              )}
            </TableCell>
            <TableCell className="text-left font-medium text-foreground">{n.title}</TableCell>
            <TableCell className="text-left text-foreground/80">{n.message}</TableCell>
            <TableCell className="text-left">
              {!n.readAt && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onMarkRead(n.id)}
                  disabled={markReadPending}
                >
                  {t("notifications.table.markRead")}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
