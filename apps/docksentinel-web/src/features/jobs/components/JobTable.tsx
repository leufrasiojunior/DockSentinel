import { Badge } from "../../../shared/components/ui/Badge";
import { type UpdateJob } from "../api/jobs";

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
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
          <tr>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Container</th>
            <th className="px-4 py-3">Imagem</th>
            <th className="px-4 py-3">Timestamps</th>
            <th className="px-4 py-3">Lock</th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {loading && (
            <tr>
              <td className="px-4 py-4 text-gray-600" colSpan={5}>
                Carregando...
              </td>
            </tr>
          )}

          {!loading && jobs.length === 0 && (
            <tr>
              <td className="px-4 py-4 text-gray-600" colSpan={5}>
                Nenhum job encontrado.
              </td>
            </tr>
          )}

          {jobs.map((j: UpdateJob) => (
            <tr key={j.id} className="hover:bg-gray-50">
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(String(j.status)) as any}>
                    {String(j.status)}
                  </Badge>
                  <div className="text-[11px] text-gray-500 font-mono">
                    {j.id.slice(0, 8)}
                  </div>
                </div>
                {j.error && (
                  <div className="mt-1 text-xs text-red-600">{j.error}</div>
                )}
              </td>

              <td className="px-4 py-4">
                <div className="font-medium text-gray-900">
                  {j.container ?? "—"}
                </div>
                <div className="text-xs text-gray-500">
                  pull: {String(!!j.pull)} • force: {String(!!j.force)}
                </div>
              </td>

              <td className="px-4 py-4">
                <div className="font-mono text-xs text-gray-900 max-w-130 truncate">
                  {j.image ?? "—"}
                </div>
              </td>

              <td className="px-4 py-4">
                <div className="text-xs text-gray-600 space-y-1">
                  <div>created: {fmt(j.createdAt)}</div>
                  <div>start: {fmt(j.startedAt)}</div>
                  <div>end: {fmt(j.finishedAt ?? null)}</div>
                </div>
              </td>

              <td className="px-4 py-4">
                <div className="text-xs text-gray-600 space-y-1">
                  <div>lockedAt: {fmt(j.lockedAt ?? null)}</div>
                  <div className="font-mono truncate max-w-65">
                    lockedBy: {j.lockedBy ?? "—"}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
