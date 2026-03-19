import { CircleCheckBig, Clock3, ListOrdered, OctagonX, RefreshCcw, Workflow } from "lucide-react";

import { FilterBar } from "../../components/product/filter-bar";
import { PageHeader } from "../../components/product/page-header";
import { SectionCard } from "../../components/product/section-card";
import { StatCard } from "../../components/product/stat-card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { JobTable } from "../../features/jobs/components/JobTable";
import { useJobs } from "../../features/jobs/hooks/useJobs";

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Queue"
        title="Execution Stream"
        description="Fila e histórico das ações disparadas pelo updater, com auto-refresh pausando quando a aba fica oculta."
        meta={
          <>
            <Badge variant="outline">{visible ? "Auto-refresh ON" : "Auto-refresh OFF"}</Badge>
            <Badge variant="outline">{filtered.length} itens filtrados</Badge>
          </>
        }
        actions={
          <Button onClick={() => refetch()} disabled={isFetching} type="button" variant="outline">
            <RefreshCcw className="size-4" />
            Recarregar
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total" value={counters.total} helper="Todos os jobs retornados pela API." icon={ListOrdered} />
        <StatCard label="Queued" value={counters.queued} helper="Aguardando execução." icon={Clock3} tone="warning" />
        <StatCard label="Running" value={counters.running} helper="Execuções em andamento." icon={Workflow} tone="info" />
        <StatCard label="Done" value={counters.done} helper="Execuções concluídas." icon={CircleCheckBig} tone="success" />
        <StatCard label="Failed" value={counters.failed} helper="Execuções com erro." icon={OctagonX} tone="destructive" />
      </div>

      <SectionCard
        title={`Lista (${filtered.length})`}
        description="Fluxo somente-leitura por enquanto, voltado a acompanhamento operacional."
      >
        <FilterBar helper={`${counters.total} jobs totais`}>
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
        </FilterBar>

        <div className="-mx-6">
          <JobTable jobs={filtered} loading={loading} />
        </div>
      </SectionCard>
    </div>
  );
}
