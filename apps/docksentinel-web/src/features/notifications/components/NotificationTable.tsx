import { Button } from "../../../shared/components/ui/Button";


function fmt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

interface NotificationTableProps {
  items: any[];
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
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
          <tr>
            <th className="px-4 py-3">Quando</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Título</th>
            <th className="px-4 py-3">Mensagem</th>
            <th className="px-4 py-3">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {loading && (
            <tr>
              <td colSpan={6} className="px-4 py-4 text-gray-600">
                Carregando...
              </td>
            </tr>
          )}

          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-4 text-gray-600">
                Nenhuma notificação encontrada.
              </td>
            </tr>
          )}

          {items.map((n) => (
            <tr
              key={n.id}
              className={[
                "hover:bg-gray-50",
                !n.readAt ? "bg-blue-50/30" : "",
              ].join(" ")}
            >
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(n.createdAt)}</td>
              <td className="px-4 py-3">
                <span
                  className={[
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    n.level === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700",
                  ].join(" ")}
                >
                  {n.level === "error" ? "ERRO" : "INFO"}
                </span>
              </td>
              <td className="px-4 py-3 text-xs">
                {n.readAt ? (
                  <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">Lida</span>
                ) : (
                  <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">Não lida</span>
                )}
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">{n.title}</td>
              <td className="px-4 py-3 text-gray-700">{n.message}</td>
              <td className="px-4 py-3">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
