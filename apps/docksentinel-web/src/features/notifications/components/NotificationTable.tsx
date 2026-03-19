import { Button } from "../../../shared/components/ui/Button";
import { Badge } from "../../../shared/components/ui/Badge";
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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-left">Quando</TableHead>
          <TableHead className="text-left">Tipo</TableHead>
          <TableHead className="text-left">Status</TableHead>
          <TableHead className="text-left">Título</TableHead>
          <TableHead className="text-left">Mensagem</TableHead>
          <TableHead className="text-left">Ação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              Carregando...
            </TableCell>
          </TableRow>
        )}

        {!loading && items.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              Nenhuma notificação encontrada.
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
                {n.level === "error" ? "ERRO" : "INFO"}
              </Badge>
            </TableCell>
            <TableCell className="text-left text-xs">
              {n.readAt ? (
                <Badge tone="gray">Lida</Badge>
              ) : (
                <Badge tone="blue">Não lida</Badge>
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
                  Marcar lida
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
