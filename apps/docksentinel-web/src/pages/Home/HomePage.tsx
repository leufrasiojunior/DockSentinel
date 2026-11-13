import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Boxes,
  Globe,
  HeartPulse,
  HousePlug,
  Power,
  PowerOff,
  RefreshCcw,
  Search,
  ShieldAlert,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { EmptyState } from "../../components/product/empty-state";
import { PageHeader } from "../../components/product/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../shared/components/ui/Input";
import { ContainerDetailsModal } from "../../features/docker/components/ContainerDetailsModal";
import { ContainerTable } from "../../features/docker/components/ContainerTable";
import { useUnifiedContainers } from "../../features/docker/hooks/useUnifiedContainers";
import {
  buildEnvironmentPath,
  listEnvironmentOverview,
  type EnvironmentOverview,
} from "../../features/environments/api/environments";
import { writeStoredEnvironmentId } from "../../features/environments/hooks/useEnvironmentRoute";
import {
  isAgentOutdated,
  type SystemVersionCheck,
} from "../../features/settings/api/settings";
import { useVersionCheck } from "../../features/settings/hooks/useVersionCheck";

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  icon: typeof Boxes;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/25 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value == null ? "—" : value}
      </div>
    </div>
  );
}

function EnvironmentCard({
  item,
  versionCheck,
}: {
  item: EnvironmentOverview;
  versionCheck: SystemVersionCheck | null;
}) {
  const { t } = useTranslation();
  const { environment, connection, containers } = item;
  const isLocal = connection.mode === "local";
  const isUp = environment.status === "online";
  const destination = buildEnvironmentPath(environment.id, "dashboard");
  const EnvironmentIcon = isLocal ? HousePlug : Globe;
  const StatusIcon = isUp ? Wifi : WifiOff;
  const latestAvailable = isLocal
    ? versionCheck?.server.hasUpdate
      ? versionCheck.server.latestVersion
      : null
    : isAgentOutdated(environment.agentVersion, versionCheck?.agent.latestVersion)
      ? versionCheck?.agent.latestVersion ?? null
      : null;

  return (
    <Link
      to={destination}
      onClick={() => writeStoredEnvironmentId(environment.id)}
      className="block group"
    >
      <Card className="h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:shadow-[0_24px_80px_-44px_rgba(16,24,40,0.55)]">
        <div className="border-b border-border/60 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/35 text-foreground">
                <EnvironmentIcon className="size-5" />
              </div>
              <div className="min-w-0 space-y-2">
                <div className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {environment.name}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isUp ? "success" : "destructive"} className="gap-1.5">
                    <StatusIcon className="size-3.5" />
                    {isUp ? t("home.statusUp") : t("home.statusDown")}
                  </Badge>
                  <Badge variant="outline">
                    {isLocal ? t("home.kindLocal") : t("home.kindRemote")}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 px-3 py-2 text-right">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("home.agentLabel")}
              </div>
              <div className="mt-1 flex flex-col items-end gap-1">
                <span className="text-sm font-medium text-foreground">
                  {environment.agentVersion ?? "—"}
                </span>
                {latestAvailable ? (
                  <Badge variant="warning" className="text-[0.65rem] px-2 py-0.5">
                    {t("updatesCheck.updateAvailableBadge", {
                      version: latestAvailable,
                    })}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            {isLocal ? connection.label : `${t("home.kindRemote")} - ${connection.label}`}
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label={t("home.metricContainers")} value={containers.total} icon={Boxes} />
            <Metric label={t("home.metricOn")} value={containers.running} icon={Power} />
            <Metric label={t("home.metricOff")} value={containers.stopped} icon={PowerOff} />
            <Metric label={t("home.metricHealth")} value={containers.healthy} icon={HeartPulse} />
          </div>

          {!containers.available ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {t("home.dataUnavailable")}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 px-6 py-4 text-sm font-medium text-foreground">
          <span>{t("home.openDashboard")}</span>
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const overviewQuery = useQuery({
    queryKey: ["environments", "overview"],
    queryFn: listEnvironmentOverview,
    retry: false,
  });

  const items = overviewQuery.data ?? [];
  const unified = useUnifiedContainers(items);
  const { versionCheck } = useVersionCheck();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("home.eyebrow")}
        title={t("home.title")}
        description={t("home.description")}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => unified.refetchAll()}
            disabled={overviewQuery.isFetching || unified.loading}
          >
            <RefreshCcw className="size-4" />
            {t("common.actions.reload")}
          </Button>
        }
      />

      {overviewQuery.isError ? (
        <EmptyState
          title={t("home.loadErrorTitle")}
          description={errorMessage(
            overviewQuery.error,
            t("home.loadErrorDescription"),
          )}
          icon={ShieldAlert}
          actions={
            <Button type="button" variant="primary" onClick={() => overviewQuery.refetch()}>
              {t("common.actions.retry")}
            </Button>
          }
        />
      ) : null}

      {!overviewQuery.isError && items.length === 0 ? (
        <EmptyState
          title={t("home.emptyTitle")}
          description={t("home.emptyDescription")}
          icon={HousePlug}
        />
      ) : null}

      {!overviewQuery.isError && items.length > 0 ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) => (
              <EnvironmentCard
                key={item.environment.id}
                item={item}
                versionCheck={versionCheck}
              />
            ))}
          </div>

          {unified.busy ? (
            <Card className="border-primary/15 bg-primary/8 px-5 py-4">
              <div className="text-sm font-medium text-foreground">
                {unified.busy.progressText}
              </div>
            </Card>
          ) : null}

          <div className="space-y-3 pt-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {t("home.unifiedSectionTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("home.unifiedSectionSubtitle")}
              </p>
            </div>

            <ContainerTable
              containers={unified.containers}
              loading={unified.loading || overviewQuery.isLoading}
              selected={unified.selected}
              allSelected={unified.allSelected}
              onToggleAll={unified.toggleAll}
              onToggleOne={unified.toggleOne}
              onDetails={unified.setDetailsKey}
              onCheck={unified.runUpdateCheckOne}
              onUpdate={unified.handleUpdateOne}
              onRefetch={unified.refetchAll}
              onCheckAll={unified.handleCheckAll}
              onUpdateSelected={unified.handleUpdateSelected}
              onScanAndUpdate={unified.handleScanAndUpdate}
              activeDetailsId={unified.detailsKey}
              isDetailsLoading={unified.detailsQuery.isLoading}
              updatingNames={unified.updatingNames}
              checks={unified.checks}
              busy={unified.busy}
              anySelected={unified.anySelected}
              selectedBlockedCount={unified.selectedBlocked.length}
              showEnvironmentColumn
              filterSlot={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={unified.envFilter === "all" ? "primary" : "outline"}
                      onClick={() => unified.setEnvFilter("all")}
                    >
                      {t("containers.filterAllEnvironments")}
                    </Button>
                    {items.map((envItem) => (
                      <Button
                        key={envItem.environment.id}
                        type="button"
                        size="sm"
                        variant={
                          unified.envFilter === envItem.environment.id
                            ? "primary"
                            : "outline"
                        }
                        onClick={() => unified.setEnvFilter(envItem.environment.id)}
                      >
                        {envItem.connection.mode === "local" ? (
                          <HousePlug className="size-3.5" />
                        ) : (
                          <Globe className="size-3.5" />
                        )}
                        {envItem.environment.name}
                      </Button>
                    ))}
                  </div>

                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={unified.searchQuery}
                      onChange={(e) => unified.setSearchQuery(e.target.value)}
                      placeholder={t("containers.searchPlaceholder")}
                      className="pl-9"
                    />
                  </div>
                </div>
              }
            />

            <ContainerDetailsModal
              detailsId={unified.detailsKey}
              onClose={() => unified.setDetailsKey(null)}
              isLoading={unified.detailsQuery.isLoading}
              isError={unified.detailsQuery.isError}
              error={unified.detailsQuery.error}
              details={unified.detailsQuery.data}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
