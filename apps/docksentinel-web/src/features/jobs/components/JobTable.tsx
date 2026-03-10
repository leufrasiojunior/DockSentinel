import { Badge } from "../../../shared/components/ui/Badge";
import { type UpdateJob } from "../api/jobs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s.includes("fail")) return "red";
  if (s.includes("run")) return "blue";
  if (s.includes("done") || s.includes("success")) return "green";
  return "gray";
}

interface JobTableProps {
  jobs: UpdateJob[];
  loading: boolean;
}

export function JobTable({ jobs, loading }: JobTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-left">Status</TableHead>
          <TableHead className="text-left">Container</TableHead>
          <TableHead className="text-left">Imagem</TableHead>
          <TableHead className="text-left">Timestamps</TableHead>
          <TableHead className="text-left">Lock</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {loading && (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              Carregando...
            </TableCell>
          </TableRow>
        )}

        {!loading && jobs.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              Nenhum job encontrado.
            </TableCell>
          </TableRow>
        )}

        {jobs.map((j: UpdateJob) => (
          <TableRow key={j.id}>
            <TableCell className="text-left">
              <div className="flex items-center gap-2">
                <Badge tone={statusTone(String(j.status)) as any}>
                  {String(j.status)}
                </Badge>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {j.id.slice(0, 8)}
                </div>
              </div>
              {j.error && (
                <div className="mt-1 text-xs text-red-500">{j.error}</div>
              )}
            </TableCell>

            <TableCell className="text-left">
              <div className="font-medium text-foreground">
                {j.container ?? "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                pull: {String(!!j.pull)} • force: {String(!!j.force)}
              </div>
            </TableCell>

            <TableCell className="text-left">
              <div className="font-mono text-xs text-foreground max-w-[400px] truncate">
                {j.image ?? "—"}
              </div>
            </TableCell>

            <TableCell className="text-left">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>created: {fmt(j.createdAt)}</div>
                <div>start: {fmt(j.startedAt)}</div>
                <div>end: {fmt(j.finishedAt ?? null)}</div>
              </div>
            </TableCell>

            <TableCell className="text-left">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>lockedAt: {fmt(j.lockedAt ?? null)}</div>
                <div className="font-mono truncate max-w-[200px]">
                  lockedBy: {j.lockedBy ?? "—"}
                </div>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
