import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { usePageVisibility } from "../../../hooks/usePageVisibility";
import { useConfirm } from "../../../shared/components/ui/ConfirmProvider";
import { useToast } from "../../../shared/components/ui/ToastProvider";
import {
  getSchedulerBundle,
  patchSchedulerConfig,
  scanAndEnqueue,
  type SchedulerMode,
  type SchedulerScope,
} from "../api/scheduler";
import {
  type GuidedSchedule,
  type ScheduleEditorMode,
  defaultGuidedSchedule,
  describeCronExpression,
  formatGuidedSchedule,
  guidedScheduleToCron,
  hasFiveCronFields,
  tryParseGuidedSchedule,
} from "../utils/cron";
import { useEnvironmentRoute } from "../../environments/hooks/useEnvironmentRoute";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function useScheduler() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const visible = usePageVisibility();
  const { environmentId } = useEnvironmentRoute();

  const bundleQuery = useQuery({
    queryKey: ["updates", "scheduler", "bundle", environmentId],
    queryFn: () => getSchedulerBundle(environmentId),
    refetchInterval: visible ? 5_000 : false,
    retry: false,
  });

  const bundle = bundleQuery.data ?? null;
  const cfg = bundle?.config ?? null;
  const rt = bundle?.runtime ?? null;
  const hasCfg = cfg !== null;
  const cfgEnabled = cfg?.enabled ?? false;
  const cfgMode = cfg?.mode ?? "scan_only";
  const cfgScope = cfg?.scope ?? "all";
  const cfgScanLabelKey = cfg?.scanLabelKey ?? "docksentinel.scan";
  const cfgUpdateLabelKey = cfg?.updateLabelKey ?? "docksentinel.update";
  const cfgCronExpr = cfg?.cronExpr ?? "";

  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<SchedulerMode>("scan_only");
  const [scope, setScope] = useState<SchedulerScope>("all");
  const [scanLabelKey, setScanLabelKey] = useState("docksentinel.scan");
  const [updateLabelKey, setUpdateLabelKey] = useState("docksentinel.update");

  const [scheduleMode, setScheduleMode] = useState<ScheduleEditorMode>("guided");
  const [cronExpr, setCronExpr] = useState("*/5 * * * *");
  const [guidedSchedule, setGuidedSchedule] = useState<GuidedSchedule | null>(() =>
    defaultGuidedSchedule(),
  );

  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!hasCfg) return;

    setEnabled(cfgEnabled);
    setMode(cfgMode);
    setScope(cfgScope);
    setScanLabelKey(cfgScanLabelKey);
    setUpdateLabelKey(cfgUpdateLabelKey);
    setCronExpr(cfgCronExpr);

    const parsed = tryParseGuidedSchedule(cfgCronExpr);
    if (parsed) {
      setScheduleMode("guided");
      setGuidedSchedule(parsed);
      return;
    }

    setScheduleMode("advanced");
    setGuidedSchedule(null);
  }, [
    cfgCronExpr,
    cfgEnabled,
    cfgMode,
    cfgScope,
    cfgScanLabelKey,
    cfgUpdateLabelKey,
    cfg?.updatedAt,
    hasCfg,
  ]);

  const guidedBuild = useMemo(() => {
    if (!guidedSchedule) {
      return { cron: "", errors: [t("scheduler.errors.pickGuidedSchedule")] };
    }

    return guidedScheduleToCron(guidedSchedule);
  }, [guidedSchedule]);

  const effectiveCron = scheduleMode === "advanced" ? cronExpr.trim() : guidedBuild.cron;

  const schedulePreview = useMemo(() => {
    if (scheduleMode === "guided") {
      if (!guidedSchedule) {
        return {
          summary: t("scheduler.cron.guidedSummaryFallback"),
          isCustom: false,
          isValid: false,
        };
      }

      return {
        summary: formatGuidedSchedule(guidedSchedule),
        isCustom: false,
        isValid: guidedBuild.errors.length === 0,
      };
    }

    return describeCronExpression(effectiveCron);
  }, [effectiveCron, guidedBuild.errors.length, guidedSchedule, scheduleMode]);

  const dirty = useMemo(() => {
    if (!cfg) return false;
    return (
      enabled !== cfg.enabled ||
      effectiveCron !== cfg.cronExpr ||
      mode !== cfg.mode ||
      scope !== cfg.scope ||
      scanLabelKey !== cfg.scanLabelKey ||
      updateLabelKey !== cfg.updateLabelKey
    );
  }, [cfg, effectiveCron, enabled, mode, scope, scanLabelKey, updateLabelKey]);

  function handleScheduleModeChange(nextMode: ScheduleEditorMode) {
    if (nextMode === "advanced") {
      setCronExpr(guidedBuild.cron || cronExpr.trim());
      setScheduleMode("advanced");
      return;
    }

    const parsed = tryParseGuidedSchedule(cronExpr);
    setGuidedSchedule(parsed);
    setScheduleMode("guided");
  }

  async function handleSave() {
    if (!cfg || saving) return;

    if (scheduleMode === "guided") {
      if (!guidedSchedule) {
        toast.error(t("scheduler.errors.pickGuidedSchedule"), "Scheduler");
        return;
      }

      if (guidedBuild.errors.length > 0) {
        toast.error(guidedBuild.errors[0] ?? t("scheduler.errors.invalidSchedule"), "Scheduler");
        return;
      }
    }

    if (!hasFiveCronFields(effectiveCron)) {
      toast.error(t("scheduler.errors.invalidCron"), "Scheduler");
      return;
    }

    setSaving(true);
    try {
      await patchSchedulerConfig(environmentId, {
        enabled,
        cronExpr: effectiveCron,
        mode,
        scope,
        scanLabelKey,
        updateLabelKey,
      });
      toast.success(t("scheduler.success.saved"), "Scheduler");
      await qc.invalidateQueries({ queryKey: ["updates", "scheduler", "bundle", environmentId] });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || t("scheduler.errors.saveError"), "Scheduler");
    } finally {
      setSaving(false);
    }
  }

  async function handleScanAndEnqueue() {
    const ok = await confirm.confirm({
      title: t("scheduler.executeScanTitle"),
      description: t("scheduler.executeScanDescription"),
      confirmText: t("common.actions.execute"),
      cancelText: t("common.actions.cancel"),
    });
    if (!ok) return;

    setScanning(true);
    try {
      await scanAndEnqueue(environmentId);
      toast.success(t("scheduler.success.scanTriggered"), "Updates");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["updates", "scheduler", "bundle", environmentId] }),
        qc.invalidateQueries({ queryKey: ["updates", "jobs", environmentId] }),
      ]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || t("scheduler.errors.scanError"), "Updates");
    } finally {
      setScanning(false);
    }
  }

  return {
    bundle,
    cfg,
    rt,
    loading: bundleQuery.isLoading,
    isFetching: bundleQuery.isFetching,
    error: bundleQuery.error,
    refetch: bundleQuery.refetch,
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
    setScheduleMode: handleScheduleModeChange,
    cronExpr,
    setCronExpr,
    guidedSchedule,
    setGuidedSchedule,
    guidedBuild,
    effectiveCron,
    schedulePreview,
    dirty,
    saving,
    scanning,
    handleSave,
    handleScanAndEnqueue,
    environmentId,
    visible,
  };
}
