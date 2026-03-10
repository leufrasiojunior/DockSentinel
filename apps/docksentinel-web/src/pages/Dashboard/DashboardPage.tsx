import { Card } from "../../shared/components/ui/Card";
import { Button } from "../../shared/components/ui/Button";
import { useContainers } from "../../features/docker/hooks/useContainers";
import { ContainerTable } from "../../features/docker/components/ContainerTable";
import { ContainerDetailsModal } from "../../features/docker/components/ContainerDetailsModal";

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

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Containers do host Docker + checagem de updates por imagem.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => refetch()}
            disabled={loading || !!busy}
            type="button"
          >
            Recarregar
          </Button>

          <Button
            onClick={handleScanOnly}
            disabled={loading || !!busy}
            type="button"
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
            Scan + Enqueue
          </Button>

          <Button
            onClick={handleCheckAll}
            disabled={loading || !!busy || containers.length === 0}
            type="button"
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
        </div>
      </div>

      {busy && (
        <Card className="px-4 py-3">
          <div className="text-sm text-gray-700">{busy.progressText}</div>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50 px-4 py-3">
          <div className="text-sm text-red-700">
            Erro ao carregar containers:
            {(error as any)?.message ?? "desconhecido"}
          </div>
        </Card>
      )}

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

      {anySelected && (
        <div className="text-xs text-gray-600">
          Selecionados:{" "}
          <span className="font-medium">{selectedNames.join(", ")}</span>
        </div>
      )}

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
