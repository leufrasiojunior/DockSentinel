import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../shared/components/ui/ToastProvider";
import { useConfirm } from "../../../shared/components/ui/ConfirmProvider";
import { usePageVisibility } from "../../../hooks/usePageVisibility";
import {
  getSchedulerBundle,
  patchSchedulerConfig,
  scanAndEnqueue,
  type SchedulerMode,
  type SchedulerScope,
} from "../api/scheduler";
import {
  type CronState,
  defaultCronState,
  tryParseCronExpr,
  buildCronExpr,
} from "../utils/cron";

export function useScheduler() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const visible = usePageVisibility();

  const bundleQuery = useQuery({
    queryKey: ["updates", "scheduler", "bundle"],
    queryFn: getSchedulerBundle,
    refetchInterval: visible ? 5_000 : false,
    retry: false,
  });

  const bundle = bundleQuery.data ?? null;
  const cfg = bundle?.config ?? null;
  const rt = bundle?.runtime ?? null;

  // form state
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<SchedulerMode>("scan_only");
  const [scope, setScope] = useState<SchedulerScope>("all");
  const [scanLabelKey, setScanLabelKey] = useState("docksentinel.scan");
  const [updateLabelKey, setUpdateLabelKey] = useState("docksentinel.update");

  // cron: builder + manual fallback
  const [cronManual, setCronManual] = useState(false);
  const [cronExpr, setCronExpr] = useState("*/5 * * * *");
  const [cronState, setCronState] = useState<CronState>(() => defaultCronState());

  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!cfg) return;

    setEnabled(cfg.enabled);
    setMode(cfg.mode);
    setScope(cfg.scope);
    setScanLabelKey(cfg.scanLabelKey);
    setUpdateLabelKey(cfg.updateLabelKey);

    const parsed = tryParseCronExpr(cfg.cronExpr);
    if (parsed) {
      setCronManual(false);
      setCronState(parsed);
      setCronExpr(cfg.cronExpr);
    } else {
      setCronManual(true);
      setCronExpr(cfg.cronExpr);
      setCronState(defaultCronState());
    }
  }, [cfg?.updatedAt]);

  const cronBuilt = useMemo(() => buildCronExpr(cronState), [cronState]);
  const effectiveCron = cronManual ? cronExpr.trim() : cronBuilt.cron;

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
  }, [cfg, enabled, effectiveCron, mode, scope, scanLabelKey, updateLabelKey]);

  async function handleSave() {
    if (!cfg || saving) return;

    const parts = effectiveCron.split(/\s+/).filter(Boolean);
    if (parts.length !== 5) {
      toast.error("Cron inválido: precisa ter 5 campos.", "Scheduler");
      return;
    }

    if (!cronManual && cronBuilt.errors.length > 0) {
      toast.error("Cron inválido: ajuste os campos.", "Scheduler");
      return;
    }

    setSaving(true);
    try {
      await patchSchedulerConfig({
        enabled,
        cronExpr: effectiveCron,
        mode,
        scope,
        scanLabelKey,
        updateLabelKey,
      });
      toast.success("Config salva.", "Scheduler");
      await qc.invalidateQueries({ queryKey: ["updates", "scheduler", "bundle"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar.", "Scheduler");
    } finally {
      setSaving(false);
    }
  }

  async function handleScanAndEnqueue() {
    const ok = await confirm.confirm({
      title: "Executar scan agora?",
      description: "Vai escanear containers e enfileirar jobs.",
      confirmText: "Executar",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    setScanning(true);
    try {
      await scanAndEnqueue();
      toast.success("Scan disparado.", "Updates");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["updates", "scheduler", "bundle"] }),
        qc.invalidateQueries({ queryKey: ["updates", "jobs"] }),
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao executar scan.", "Updates");
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
    cronManual,
    setCronManual,
    cronExpr,
    setCronExpr,
    cronState,
    setCronState,
    cronBuilt,
    effectiveCron,
    dirty,
    saving,
    scanning,
    handleSave,
    handleScanAndEnqueue,
    visible,
  };
}
