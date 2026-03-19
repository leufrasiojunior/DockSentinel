import { Boxes, CircleCheckBig, RefreshCcw, ShieldAlert, Sparkles } from "lucide-react";

import { ActionBar } from "../../components/product/action-bar";
import { EmptyState } from "../../components/product/empty-state";
import { PageHeader } from "../../components/product/page-header";
import { StatCard } from "../../components/product/stat-card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ContainerDetailsModal } from "../../features/docker/components/ContainerDetailsModal";
import { ContainerTable } from "../../features/docker/components/ContainerTable";
import { useContainers } from "../../features/docker/hooks/useContainers";

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

export function DashboardPage() {
  const {
    containers,
    loading,
    error,
    refetch,
    selected,
    selectedNames,
    allSelected,
    anySelected,
    selectedBlocked,
    busy,
    checks,
    detailsId,
    setDetailsId,
    detailsQuery,
    toggleAll,
    toggleOne,
    handleCheckAll,
    handleUpdateSelected,
    handleScanOnly,
    handleScanAndUpdate,
    runUpdateCheckOne,
    handleUpdateOne,
  } = useContainers();

  const checkedCount = Object.values(checks).filter((state) => state.status === "done").length;
  const updateAvailable = Object.values(checks).reduce(
    (count, state) => count + (state.status === "done" && state.result.hasUpdate ? 1 : 0),
    0,
  );
  const runningCount = containers.filter((container) => container.state.toLowerCase().includes("run")).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        meta={
          <>
            <Badge variant="outline">{containers.length} containers</Badge>
            <Badge variant="outline">{runningCount} running</Badge>
            <Badge variant="outline">{updateAvailable} updates detectados</Badge>
          </>
        }
        actions={
          <ActionBar className="justify-end">
            <Button onClick={() => refetch()} disabled={loading || !!busy} type="button" variant="outline">
              <RefreshCcw className="size-4" />
              Recarregar
            </Button>

            <Button
              onClick={handleScanOnly}
              disabled={loading || !!busy}
              type="button"
              variant="secondary"
              title="Roda scan manual (não enfileira jobs)"
            >
              Scan
            </Button>

            <Button
              variant="primary"
              onClick={handleScanAndUpdate}
              disabled={loading || !!busy}
              type="button"
              title="Roda scan e enfileira jobs para atualizar"
            >
              Scan + enqueue
            </Button>

            <Button
              onClick={handleCheckAll}
              disabled={loading || !!busy || containers.length === 0}
              type="button"
              variant="secondary"
            >
              Checar todos
            </Button>

            <Button
              variant="primary"
              onClick={handleUpdateSelected}
              disabled={loading || !!busy || !anySelected}
              type="button"
              title={
                selectedBlocked.length > 0
                  ? "Alguns selecionados estão bloqueados por label"
                  : undefined
              }
            >
              Atualizar selecionados
            </Button>
          </ActionBar>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Containers"
          value={containers.length}
          helper="Inventário atual do host monitorado."
          icon={Boxes}
        />
        <StatCard
          label="Running"
          value={runningCount}
          helper="Containers com estado ativo no momento."
          icon={CircleCheckBig}
          tone="success"
        />
        <StatCard
          label="Checks concluídos"
          value={checkedCount}
          helper="Quantidade de verificações manuais já consolidadas."
          icon={Sparkles}
          tone="info"
        />
        <StatCard
          label="Bloqueados"
          value={selectedBlocked.length}
          helper="Selecionados que não podem ser atualizados automaticamente."
          icon={ShieldAlert}
          tone={selectedBlocked.length > 0 ? "warning" : "default"}
        />
      </div>

      {busy ? (
        <Card className="border-primary/15 bg-primary/8 px-5 py-4">
          <div className="text-sm font-medium text-foreground">{busy.progressText}</div>
        </Card>
      ) : null}

      {error ? (
        <EmptyState
          title="Falha ao carregar containers"
          description={errorMessage(error, "Erro desconhecido ao consultar o Docker host.")}
          icon={ShieldAlert}
          actions={
            <Button onClick={() => refetch()} variant="primary">
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <ContainerTable
          containers={containers}
          loading={loading}
          selected={selected}
          allSelected={allSelected}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
          onDetails={setDetailsId}
          onCheck={runUpdateCheckOne}
          onUpdate={handleUpdateOne}
          checks={checks}
          busy={!!busy}
        />
      )}

      {anySelected ? (
        <Card className="px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Selecionados
          </div>
          <div className="mt-2 text-sm text-foreground">{selectedNames.join(", ")}</div>
        </Card>
      ) : null}

      <ContainerDetailsModal
        detailsId={detailsId}
        onClose={() => setDetailsId(null)}
        isLoading={detailsQuery.isLoading}
        isError={detailsQuery.isError}
        error={detailsQuery.error}
        details={detailsQuery.data}
      />
    </div>
  );
}
