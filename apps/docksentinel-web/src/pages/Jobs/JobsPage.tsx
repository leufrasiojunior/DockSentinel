import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "../../layouts/ui/Badge";
import { Button } from "../../layouts/ui/Button";
import { Card, CardHeader } from "../../layouts/ui/Card";
import { usePageVisibility } from "../../hooks/usePageVisibility";
import { listJobs, type UpdateJob } from "../../api/jobs";

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

export function JobsPage() {
  const visible = usePageVisibility();
  const [filter, setFilter] = useState<
    "all" | "queued" | "running" | "done" | "failed"
  >("all");

  const jobsQuery = useQuery({
    queryKey: ["updates", "jobs"],
    queryFn: listJobs,
    refetchInterval: visible ? 4_000 : false,
    retry: false,
  });

  const jobs = jobsQuery.data ?? [];

  const counters = useMemo(() => {
    const c = {
      queued: 0,
      running: 0,
      done: 0,
      failed: 0,
      total: jobs.length,
    };

    for (const j of jobs) {
      const s = String(j.status ?? "").toLowerCase();
      if (s.includes("queue")) c.queued++;
      else if (s.includes("run")) c.running++;
      else if (s.includes("fail")) c.failed++;
      else if (s.includes("done") || s.includes("success")) c.done++;
    }
    return c;
  }, [jobs]);

  const filtered = useMemo(() => {
    if (filter === "all") return jobs;
    return jobs.filter((j) =>
      String(j.status ?? "").toLowerCase().includes(filter),
    );
  }, [jobs, filter]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="mt-1 text-sm text-gray-600">
            Fila/histórico de ações do updater. Auto-refresh:{" "}
            {visible ? "ON" : "OFF (aba oculta)"}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => jobsQuery.refetch()}
            disabled={jobsQuery.isFetching}
            type="button"
          >
            Recarregar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="px-4 py-3">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-semibold">{counters.total}</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-xs text-gray-500">Queued</div>
          <div className="text-lg font-semibold">{counters.queued}</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-xs text-gray-500">Running</div>
          <div className="text-lg font-semibold">{counters.running}</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-xs text-gray-500">Done</div>
          <div className="text-lg font-semibold">{counters.done}</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-xs text-gray-500">Failed</div>
          <div className="text-lg font-semibold">{counters.failed}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title={`Lista (${filtered.length})`}
          subtitle="Visualização somente-leitura por enquanto (sem ações)."
          right={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={filter === "all" ? "primary" : "ghost"}
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filter === "queued" ? "primary" : "ghost"}
                onClick={() => setFilter("queued")}
              >
                Queued
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filter === "running" ? "primary" : "ghost"}
                onClick={() => setFilter("running")}
              >
                Running
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filter === "done" ? "primary" : "ghost"}
                onClick={() => setFilter("done")}
              >
                Done
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filter === "failed" ? "primary" : "ghost"}
                onClick={() => setFilter("failed")}
              >
                Failed
              </Button>
            </div>
          }
        />

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
              {jobsQuery.isLoading && (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={5}>
                    Carregando...
                  </td>
                </tr>
              )}

              {!jobsQuery.isLoading && filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={5}>
                    Nenhum job encontrado.
                  </td>
                </tr>
              )}

              {filtered.map((j: UpdateJob) => (
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
      </Card>
    </div>
  );
}
