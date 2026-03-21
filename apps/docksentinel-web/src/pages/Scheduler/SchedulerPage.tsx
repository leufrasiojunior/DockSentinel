import { Bot, Clock3, RefreshCcw, ScanSearch, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ActionBar } from "../../components/product/action-bar";
import { FormField } from "../../components/product/form-field";
import { PageHeader } from "../../components/product/page-header";
import { SectionCard } from "../../components/product/section-card";
import { StatCard } from "../../components/product/stat-card";
import { StatusBadge } from "../../components/product/status-badge";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { type SchedulerMode, type SchedulerScope } from "../../features/scheduler/api/scheduler";
import { CronBuilder } from "../../features/scheduler/components/CronBuilder";
import { RuntimeCard } from "../../features/scheduler/components/RuntimeCard";
import { useScheduler } from "../../features/scheduler/hooks/useScheduler";
import { formatDateTime } from "../../i18n/format";
import { getSchedulerModeLabel, getSchedulerScopeLabel } from "../../i18n/helpers";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  return formatDateTime(iso) ?? "—";
}

export function SchedulerPage() {
  const { t } = useTranslation();
  const {
    cfg,
    rt,
    loading,
    isFetching,
    refetch,
    enabled,
    setEnabled,
    mode,
    setMode,
    scope,
    setScope,
    scanLabelKey,
    setScanLabelKey,
    updateLabelKey,
    setUpdateLabelKey,
    scheduleMode,
    setScheduleMode,
    cronExpr,
    setCronExpr,
    guidedSchedule,
    setGuidedSchedule,
    effectiveCron,
    schedulePreview,
    dirty,
    saving,
    scanning,
    handleSave,
    handleScanAndEnqueue,
    visible,
  } = useScheduler();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("scheduler.eyebrow")}
        title={t("scheduler.title")}
        description={t("scheduler.description")}
        meta={
          <>
            <Badge variant="outline">
              {visible ? t("common.states.autoRefreshOn") : t("common.states.autoRefreshOff")}
            </Badge>
            <Badge variant={schedulePreview.isCustom ? "warning" : "info"}>
              {schedulePreview.isCustom ? t("common.states.customCron") : t("common.states.guided")}
            </Badge>
            <Badge variant="outline">{rt?.timeZone ?? "UTC"}</Badge>
          </>
        }
        actions={
          <ActionBar className="justify-end">
            <Button onClick={() => refetch()} disabled={isFetching} type="button" variant="outline">
              <RefreshCcw className="size-4" />
              {t("common.actions.reload")}
            </Button>

            <Button
              variant="primary"
              onClick={handleScanAndEnqueue}
              disabled={loading || scanning}
              type="button"
            >
              <ScanSearch className="size-4" />
              {scanning ? t("scheduler.running") : t("scheduler.scanAndEnqueue")}
            </Button>
          </ActionBar>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("common.labels.status")}
          value={<StatusBadge value={enabled} />}
          helper={t("scheduler.stats.enabledHelper")}
          icon={ShieldCheck}
          tone={enabled ? "success" : "warning"}
        />
        <StatCard label={t("common.labels.mode")} value={getSchedulerModeLabel(t, mode)} helper={t("scheduler.stats.modeHelper")} icon={Bot} tone="info" />
        <StatCard label={t("common.labels.scope")} value={getSchedulerScopeLabel(t, scope)} helper={t("scheduler.stats.scopeHelper")} icon={Clock3} />
        <StatCard
          label={t("common.labels.editor")}
          value={scheduleMode === "guided" ? t("common.states.guided") : t("scheduler.stats.editorHelperAdvanced")}
          helper={schedulePreview.summary}
          icon={ScanSearch}
          tone={schedulePreview.isCustom ? "warning" : "default"}
        />
      </div>

      <SectionCard
        title={t("scheduler.whenSectionTitle")}
        description={t("scheduler.whenSectionDescription")}
        actions={
          <Button variant="primary" onClick={handleSave} disabled={!cfg || !dirty || saving} type="button">
            {saving ? t("common.actions.saving") : dirty ? t("scheduler.saveChanges") : t("scheduler.noChanges")}
          </Button>
        }
      >
        <CronBuilder
          scheduleMode={scheduleMode}
          setScheduleMode={setScheduleMode}
          guidedSchedule={guidedSchedule}
          setGuidedSchedule={setGuidedSchedule}
          cronExpr={cronExpr}
          setCronExpr={setCronExpr}
          effectiveCron={effectiveCron}
          timeZone={rt?.timeZone}
        />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title={t("scheduler.executionTitle")}
          description={t("scheduler.executionDescription")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="border-border/60 bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">{t("scheduler.enabledTitle")}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {t("scheduler.enabledDescription")}
                  </div>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
            </Card>

            <FormField label={t("common.labels.mode")} description={t("scheduler.modeDescription")}>
              <Select
                value={mode}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  setMode(event.target.value as SchedulerMode)
                }
              >
                <option value="scan_only">{t("common.schedulerModes.scan_only")}</option>
                <option value="scan_and_update">{t("common.schedulerModes.scan_and_update")}</option>
              </Select>
            </FormField>

            <FormField label={t("common.labels.scope")} description={t("scheduler.scopeDescription")}>
              <Select
                value={scope}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  setScope(event.target.value as SchedulerScope)
                }
              >
                <option value="all">{t("common.schedulerScopes.all")}</option>
                <option value="labeled">{t("common.schedulerScopes.labeled")}</option>
              </Select>
            </FormField>

            <FormField label="scanLabelKey" description={t("scheduler.scanLabelKeyDescription")}>
              <Input
                value={scanLabelKey}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setScanLabelKey(event.target.value)}
              />
            </FormField>

            <FormField label="updateLabelKey" description={t("scheduler.updateLabelKeyDescription")}>
              <Input
                value={updateLabelKey}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUpdateLabelKey(event.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="border-border/60 bg-muted/20 p-4 text-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("scheduler.configRunning")}</div>
              <div className="mt-2">{cfg ? <StatusBadge value={Boolean(cfg.running)} /> : "—"}</div>
            </Card>

            <Card className="border-border/60 bg-muted/20 p-4 text-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("scheduler.configLastRunAt")}</div>
              <div className="mt-2 text-foreground">{fmt(cfg?.lastRunAt ?? null)}</div>
            </Card>

            <Card className="border-border/60 bg-muted/20 p-4 text-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("scheduler.configLockedAt")}</div>
              <div className="mt-2 text-foreground">{fmt(cfg?.lockedAt ?? null)}</div>
            </Card>

            <Card className="border-border/60 bg-muted/20 p-4 text-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("scheduler.configLockedBy")}</div>
              <div className="mt-2 truncate font-mono text-xs text-foreground">{cfg?.lockedBy ?? "—"}</div>
            </Card>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              {t("scheduler.createdAtRaw")}: <span className="font-mono text-foreground">{cfg?.createdAt ?? "—"}</span>
            </span>
            <span>
              {t("scheduler.updatedAtRaw")}: <span className="font-mono text-foreground">{cfg?.updatedAt ?? "—"}</span>
            </span>
          </div>
        </SectionCard>

        <RuntimeCard rt={rt} />
      </div>
    </div>
  );
}
