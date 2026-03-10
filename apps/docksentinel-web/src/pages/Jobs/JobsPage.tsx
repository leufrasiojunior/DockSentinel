import { Button } from "../../shared/components/ui/Button";
import { Card, CardHeader } from "../../shared/components/ui/Card";
import { useJobs } from "../../features/jobs/hooks/useJobs";
import { JobTable } from "../../features/jobs/components/JobTable";

export function JobsPage() {
  const {
    filtered,
    counters,
    filter,
    setFilter,
    loading,
    isFetching,
    refetch,
    visible,
  } = useJobs();

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fila/histórico de ações do updater. Auto-refresh:{" "}
            {visible ? "ON" : "OFF (aba oculta)"}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
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

        <JobTable jobs={filtered} loading={loading} />
      </Card>
    </div>
  );
}
