import { Boxes, CircleCheckBig, RefreshCcw, ShieldAlert, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
        title={t("dashboard.title")}
        meta={
          <>
            <Badge variant="outline">{t("dashboard.containersMeta", { count: containers.length })}</Badge>
            <Badge variant="outline">{t("dashboard.runningMeta", { count: runningCount })}</Badge>
            <Badge variant="outline">{t("dashboard.updatesDetectedMeta", { count: updateAvailable })}</Badge>
          </>
        }
        actions={
          <ActionBar className="justify-end">
            <Button onClick={() => refetch()} disabled={loading || !!busy} type="button" variant="outline">
              <RefreshCcw className="size-4" />
              {t("common.actions.reload")}
            </Button>

            <Button
              onClick={handleScanOnly}
              disabled={loading || !!busy}
              type="button"
              variant="secondary"
              title={t("dashboard.manualScanTitle")}
            >
              {t("dashboard.scan")}
            </Button>

            <Button
              variant="primary"
              onClick={handleScanAndUpdate}
              disabled={loading || !!busy}
              type="button"
              title={t("dashboard.scanAndEnqueueTitle")}
            >
              {t("dashboard.scanAndEnqueue")}
            </Button>

            <Button
              onClick={handleCheckAll}
              disabled={loading || !!busy || containers.length === 0}
              type="button"
              variant="secondary"
            >
              {t("dashboard.checkAll")}
            </Button>

            <Button
              variant="primary"
              onClick={handleUpdateSelected}
              disabled={loading || !!busy || !anySelected}
              type="button"
              title={
                selectedBlocked.length > 0
                  ? t("dashboard.selectedBlockedTitle")
                  : undefined
              }
            >
              {t("dashboard.updateSelected")}
            </Button>
          </ActionBar>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dashboard.statContainersLabel")}
          value={containers.length}
          helper={t("dashboard.statContainersHelper")}
          icon={Boxes}
        />
        <StatCard
          label={t("dashboard.statRunningLabel")}
          value={runningCount}
          helper={t("dashboard.statRunningHelper")}
          icon={CircleCheckBig}
          tone="success"
        />
        <StatCard
          label={t("dashboard.statChecksLabel")}
          value={checkedCount}
          helper={t("dashboard.statChecksHelper")}
          icon={Sparkles}
          tone="info"
        />
        <StatCard
          label={t("dashboard.statBlockedLabel")}
          value={selectedBlocked.length}
          helper={t("dashboard.statBlockedHelper")}
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
          title={t("dashboard.loadErrorTitle")}
          description={errorMessage(error, t("dashboard.loadErrorDescription"))}
          icon={ShieldAlert}
          actions={
            <Button onClick={() => refetch()} variant="primary">
              {t("common.actions.retry")}
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
            {t("dashboard.selectedTitle")}
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
