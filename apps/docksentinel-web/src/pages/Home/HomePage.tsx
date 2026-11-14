import { useMemo } from "react";
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
  Sparkles,
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
import { cn } from "../../shared/lib/utils/cn";

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

type KpiTheme = "purple" | "emerald" | "cyan" | "slate";

interface SystemKpiProps {
  label: string;
  value: number | string;
  indicatorText: string;
  badgeText?: string;
  icon: typeof Boxes;
  theme: KpiTheme;
}

function SystemKpiCard({
  label,
  value,
  indicatorText,
  badgeText = "LIVE DATA",
  icon: Icon,
  theme,
}: SystemKpiProps) {
  const themeStyles = {
    purple: {
      iconBox: "border-violet-500/35 bg-violet-600/20 text-violet-300 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)]",
      badge: "border-violet-500/30 bg-violet-500/10 text-violet-300",
      indicator: "text-violet-400 font-medium",
    },
    emerald: {
      iconBox: "border-emerald-500/35 bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)]",
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      indicator: "text-emerald-400 font-medium",
    },
    cyan: {
      iconBox: "border-cyan-500/35 bg-cyan-500/20 text-cyan-300 shadow-[0_0_20px_-3px_rgba(6,182,212,0.3)]",
      badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
      indicator: "text-cyan-400 font-medium",
    },
    slate: {
      iconBox: "border-slate-600/35 bg-slate-700/30 text-slate-300",
      badge: "border-slate-600/30 bg-slate-600/10 text-slate-400",
      indicator: "text-slate-400 font-medium",
    },
  }[theme];

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-white/8 bg-card/90 p-5 shadow-lg backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl border p-2.5 transition-transform duration-200",
            themeStyles.iconBox
          )}
        >
          <Icon className="size-5 shrink-0" />
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.16em]",
            themeStyles.badge
          )}
        >
          {badgeText}
        </span>
      </div>

      <div className="mt-5 space-y-1">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
          {label}
        </div>
        <div className="text-3xl font-extrabold tracking-tight text-white font-sans">
          {value}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs">
        <span className={themeStyles.indicator}>{indicatorText}</span>
      </div>
    </Card>
  );
}

function MetricMini({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  icon: typeof Boxes;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05]">
      <div className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/75">
        <Icon className="size-3 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-xl font-bold tracking-tight text-foreground">
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
      <Card className="h-full overflow-hidden rounded-3xl border border-white/8 bg-card/85 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-violet-500/40 group-hover:shadow-[0_24px_80px_-24px_rgba(139,92,246,0.25)]">
        <div className="border-b border-white/8 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-violet-300 shadow-sm transition-colors group-hover:border-violet-500/30 group-hover:bg-violet-600/10">
                <EnvironmentIcon className="size-5" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <div className="truncate text-xl font-bold tracking-tight text-white group-hover:text-violet-200 transition-colors">
                  {environment.name}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={isUp ? "success" : "destructive"}
                    className="gap-1.5 font-semibold text-[0.68rem] tracking-wider"
                  >
                    <span className="relative flex size-2">
                      <span
                        className={cn(
                          "absolute inline-flex h-full w-full rounded-full opacity-75",
                          isUp ? "animate-ping bg-emerald-400" : "bg-rose-400"
                        )}
                      />
                      <span
                        className={cn(
                          "relative inline-flex size-2 rounded-full",
                          isUp ? "bg-emerald-500" : "bg-rose-500"
                        )}
                      />
                    </span>
                    <StatusIcon className="size-3" />
                    {isUp ? t("home.statusUp") : t("home.statusDown")}
                  </Badge>
                  <Badge variant="outline" className="border-white/10 bg-white/[0.02] text-xs">
                    {isLocal ? t("home.kindLocal") : t("home.kindRemote")}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-right">
              <div className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
                {t("home.agentLabel")}
              </div>
              <div className="mt-1 flex flex-col items-end gap-1">
                <span className="text-sm font-semibold text-white font-mono">
                  {environment.agentVersion ?? "—"}
                </span>
                {latestAvailable ? (
                  <Badge variant="warning" className="text-[0.62rem] px-2 py-0.5 font-semibold">
                    {t("updatesCheck.updateAvailableBadge", {
                      version: latestAvailable,
                    })}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs font-medium text-muted-foreground/80 font-mono">
            {isLocal ? connection.label : `${t("home.kindRemote")} · ${connection.label}`}
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            <MetricMini label={t("home.metricContainers")} value={containers.total} icon={Boxes} />
            <MetricMini label={t("home.metricOn")} value={containers.running} icon={Power} />
            <MetricMini label={t("home.metricOff")} value={containers.stopped} icon={PowerOff} />
            <MetricMini label={t("home.metricHealth")} value={containers.healthy} icon={HeartPulse} />
          </div>

          {!containers.available ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              {t("home.dataUnavailable")}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-white/8 px-6 py-4 text-xs font-semibold text-violet-300 transition-colors group-hover:text-white">
          <span>{t("home.openDashboard")}</span>
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
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

  // Métricas agregadas de todos os ambientes
  const stats = useMemo(() => {
    let totalContainers = 0;
    let totalRunning = 0;
    let totalStopped = 0;
    let totalHealthy = 0;
    let onlineEnvs = 0;

    for (const item of items) {
      if (item.environment.status === "online") onlineEnvs++;
      if (item.containers.available) {
        totalContainers += item.containers.total ?? 0;
        totalRunning += item.containers.running ?? 0;
        totalStopped += item.containers.stopped ?? 0;
        totalHealthy += item.containers.healthy ?? 0;
      }
    }

    const healthPercent =
      totalRunning > 0 ? Math.round((totalHealthy / totalRunning) * 100) : 100;

    return {
      totalContainers,
      totalRunning,
      totalStopped,
      totalHealthy,
      healthPercent,
      onlineEnvs,
    };
  }, [items]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-violet-500" />
            </span>
            <span className="font-mono text-[0.68rem] font-bold tracking-widest text-violet-300">
              DOCK SENTINEL · LIVE SYSTEM
            </span>
          </div>
        }
        title={
          <span className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            System <span className="text-gradient-purple-cyan">Overview</span>
          </span>
        }
        description={t("home.overviewSubtitle", {
          online: stats.onlineEnvs,
          containers: stats.totalContainers,
        })}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Button
              type="button"
              variant="highlight"
              onClick={() => unified.handleScanAndUpdate()}
              disabled={unified.busy !== null}
              className="rounded-2xl px-5 h-10 gap-2 shrink-0 font-medium text-xs sm:text-sm"
            >
              <Sparkles className="size-4 shrink-0 text-violet-600" />
              {t("home.checkAndUpdateAction")}
            </Button>
            <Button
              type="button"
              variant="glass"
              size="icon"
              onClick={() => unified.refetchAll()}
              disabled={overviewQuery.isFetching || unified.loading}
              title={t("common.actions.reload")}
              className="rounded-2xl size-10 shrink-0"
            >
              <RefreshCcw
                className={cn(
                  "size-4 text-foreground",
                  (overviewQuery.isFetching || unified.loading) && "animate-spin"
                )}
              />
            </Button>
          </div>
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
          {/* Top 4 System KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SystemKpiCard
              label={t("home.metricContainers")}
              value={stats.totalContainers}
              indicatorText={t("home.metricTotalSummary", { count: items.length })}
              icon={Boxes}
              theme="purple"
            />
            <SystemKpiCard
              label={t("home.metricOn")}
              value={stats.totalRunning}
              indicatorText={t("home.metricHealthySummary", { percent: stats.healthPercent })}
              icon={Power}
              theme="emerald"
            />
            <SystemKpiCard
              label={t("home.metricOff")}
              value={stats.totalStopped}
              indicatorText={stats.totalStopped === 0 ? "0 offline" : `${stats.totalStopped} offline`}
              badgeText="STANDBY"
              icon={PowerOff}
              theme="slate"
            />
            <SystemKpiCard
              label={t("home.metricHealth")}
              value={stats.totalHealthy}
              indicatorText={`${stats.onlineEnvs} / ${items.length} hosts online`}
              icon={HeartPulse}
              theme="cyan"
            />
          </div>

          {/* Environment Cards Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
                {t("home.environmentsSectionTitle")}
              </h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((item) => (
                <EnvironmentCard
                  key={item.environment.id}
                  item={item}
                  versionCheck={versionCheck}
                />
              ))}
            </div>
          </div>

          {unified.busy ? (
            <Card className="border-violet-500/30 bg-violet-600/10 px-5 py-4 rounded-3xl shadow-lg">
              <div className="flex items-center gap-3 text-sm font-medium text-white">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-violet-500" />
                </span>
                {unified.busy.progressText}
              </div>
            </Card>
          ) : null}

          {/* Unified Containers Table Section */}
          <div className="space-y-4 pt-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {t("home.unifiedSectionTitle")}
              </h2>
              <p className="text-xs text-muted-foreground/80">
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
                      className="rounded-xl font-medium"
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
                        className="rounded-xl font-medium gap-1.5"
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
                      className="pl-9 rounded-xl border-white/10 bg-white/[0.03] focus:border-violet-500/50"
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
