import { CircleCheckBig, Clock3, ListOrdered, OctagonX, RefreshCcw, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";

import { FilterBar } from "../../components/product/filter-bar";
import { PageHeader } from "../../components/product/page-header";
import { SectionCard } from "../../components/product/section-card";
import { StatCard } from "../../components/product/stat-card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { JobTable } from "../../features/jobs/components/JobTable";
import { useJobs } from "../../features/jobs/hooks/useJobs";
import { getJobFilterLabel } from "../../i18n/helpers";

export function JobsPage() {
  const { t } = useTranslation();
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
        eyebrow={t("jobs.eyebrow")}
        title={t("jobs.title")}
        description={t("jobs.description")}
        meta={
          <>
            <Badge variant="outline">
              {visible ? t("common.states.autoRefreshOn") : t("common.states.autoRefreshOff")}
            </Badge>
            <Badge variant="outline">{t("jobs.filteredItems", { count: filtered.length })}</Badge>
          </>
        }
        actions={
          <Button onClick={() => refetch()} disabled={isFetching} type="button" variant="outline">
            <RefreshCcw className="size-4" />
            {t("common.actions.reload")}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={t("common.labels.total")} value={counters.total} helper={t("jobs.stats.totalHelper")} icon={ListOrdered} />
        <StatCard label={t("jobs.filters.queued")} value={counters.queued} helper={t("jobs.stats.queuedHelper")} icon={Clock3} tone="warning" />
        <StatCard label={t("jobs.filters.running")} value={counters.running} helper={t("jobs.stats.runningHelper")} icon={Workflow} tone="info" />
        <StatCard label={t("jobs.filters.done")} value={counters.done} helper={t("jobs.stats.doneHelper")} icon={CircleCheckBig} tone="success" />
        <StatCard label={t("jobs.filters.failed")} value={counters.failed} helper={t("jobs.stats.failedHelper")} icon={OctagonX} tone="destructive" />
      </div>

      <SectionCard
        title={t("jobs.sectionTitle", { count: filtered.length })}
        description={t("jobs.sectionDescription")}
      >
        <FilterBar helper={t("jobs.helper", { count: counters.total })}>
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "primary" : "ghost"}
            onClick={() => setFilter("all")}
          >
            {getJobFilterLabel(t, "all")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "queued" ? "primary" : "ghost"}
            onClick={() => setFilter("queued")}
          >
            {getJobFilterLabel(t, "queued")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "running" ? "primary" : "ghost"}
            onClick={() => setFilter("running")}
          >
            {getJobFilterLabel(t, "running")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "done" ? "primary" : "ghost"}
            onClick={() => setFilter("done")}
          >
            {getJobFilterLabel(t, "done")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "failed" ? "primary" : "ghost"}
            onClick={() => setFilter("failed")}
          >
            {getJobFilterLabel(t, "failed")}
          </Button>
        </FilterBar>

        <div className="-mx-6">
          <JobTable jobs={filtered} loading={loading} />
        </div>
      </SectionCard>
    </div>
  );
}
