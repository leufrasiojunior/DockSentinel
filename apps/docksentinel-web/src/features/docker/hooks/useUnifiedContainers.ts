import { useMemo, useRef, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getAllowAutoUpdateFromLabels,
  getContainerDetails,
  listContainers,
  updateCheck,
  updateContainer,
} from "../api/docker";
import {
  scanAndEnqueue,
  type ScanResult,
  type ScanResultOk,
} from "../../updates/api/updates";
import { type EnvironmentOverview } from "../../environments/api/environments";
import { useToast } from "../../../shared/components/ui/ToastProvider";
import { useConfirm } from "../../../shared/components/ui/ConfirmProvider";
import { type BusyState, type CheckState, type ContainerDetails } from "../types";
import { type ContainerTableRow } from "../components/ContainerTable";
import { formatList } from "../../../i18n/format";

function isCompletedScanResult(result: ScanResult): result is ScanResultOk {
  return typeof (result as { hasUpdate?: unknown }).hasUpdate === "boolean";
}

function splitCompositeKey(compositeKey: string): {
  environmentId: string;
  target: string;
} {
  const idx = compositeKey.indexOf(":");
  if (idx === -1) {
    return { environmentId: "local", target: compositeKey };
  }
  return {
    environmentId: compositeKey.slice(0, idx),
    target: compositeKey.slice(idx + 1),
  };
}

export function useUnifiedContainers(environments: EnvironmentOverview[]) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [envFilter, setEnvFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [busy, setBusy] = useState<BusyState>(null);
  const [updatingNames, setUpdatingNames] = useState<Record<string, boolean>>({});
  const updatingNamesRef = useRef(new Set<string>());
  const [detailsKey, setDetailsKey] = useState<string | null>(null);

  const onlineEnvironments = useMemo(
    () =>
      environments.filter(
        (item) => item.environment.status === "online" && item.containers.available,
      ),
    [environments],
  );

  const containerQueries = useQueries({
    queries: onlineEnvironments.map((item) => ({
      queryKey: ["docker", "containers", item.environment.id],
      queryFn: () => listContainers(item.environment.id),
      refetchInterval: 15_000,
    })),
  });

  const allContainers = useMemo<ContainerTableRow[]>(() => {
    const rows: ContainerTableRow[] = [];
    onlineEnvironments.forEach((envItem, idx) => {
      const list = containerQueries[idx]?.data;
      if (!Array.isArray(list)) return;
      for (const c of list) {
        rows.push({
          ...c,
          environmentId: envItem.environment.id,
          environmentName: envItem.environment.name,
          environmentKind: envItem.connection.mode,
          compositeKey: `${envItem.environment.id}:${c.name}`,
        });
      }
    });
    return rows;
  }, [onlineEnvironments, containerQueries]);

  const filteredContainers = useMemo<ContainerTableRow[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    return allContainers.filter((c) => {
      if (envFilter !== "all" && c.environmentId !== envFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.image.toLowerCase().includes(q) ||
        (c.environmentName ?? "").toLowerCase().includes(q)
      );
    });
  }, [allContainers, envFilter, searchQuery]);

  const loading = containerQueries.some((q) => q.isLoading);

  const detailsQuery = useQuery({
    queryKey: ["docker", "unified-details", detailsKey],
    queryFn: async () => {
      const parsed = splitCompositeKey(detailsKey!);
      return (await getContainerDetails(
        parsed.environmentId,
        parsed.target,
      )) as ContainerDetails;
    },
    enabled: !!detailsKey,
    retry: false,
  });

  const selectedKeys = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected],
  );

  const allSelected = useMemo(() => {
    if (filteredContainers.length === 0) return false;
    return filteredContainers.every((c) => !!selected[c.compositeKey!]);
  }, [filteredContainers, selected]);

  const anySelected = selectedKeys.length > 0;

  const selectedContainers = useMemo(() => {
    const map = new Map(allContainers.map((c) => [c.compositeKey!, c] as const));
    return selectedKeys
      .map((k) => map.get(k))
      .filter(Boolean) as ContainerTableRow[];
  }, [allContainers, selectedKeys]);

  const selectedBlocked = useMemo(
    () =>
      selectedContainers.filter((c) => !getAllowAutoUpdateFromLabels(c.labels)),
    [selectedContainers],
  );

  async function refetchAll() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["environments", "overview"] }),
      ...onlineEnvironments.map((env) =>
        qc.invalidateQueries({
          queryKey: ["docker", "containers", env.environment.id],
        }),
      ),
    ]);
  }

  function toggleAll() {
    const next = !allSelected;
    setSelected((prev) => {
      const updated = { ...prev };
      for (const c of filteredContainers) {
        if (c.compositeKey) updated[c.compositeKey] = next;
      }
      return updated;
    });
  }

  function toggleOne(key: string) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function runUpdateCheckOne(compositeKey: string) {
    const { environmentId, target: name } = splitCompositeKey(compositeKey);
    setChecks((prev) => ({ ...prev, [compositeKey]: { status: "checking" } }));
    try {
      const result = await updateCheck(environmentId, name);
      setChecks((prev) => ({
        ...prev,
        [compositeKey]: {
          status: "done",
          result,
          checkedAt: new Date().toISOString(),
        },
      }));
    } catch (e: any) {
      const msg = e?.message ?? t("containers.updateCheckError");
      setChecks((prev) => ({
        ...prev,
        [compositeKey]: { status: "error", error: msg },
      }));
      toast.error(msg, t("containers.updateCheckTitle"));
    }
  }

  async function handleUpdateOne(compositeKey: string) {
    if (busy || updatingNamesRef.current.has(compositeKey)) return;
    const { environmentId, target: name } = splitCompositeKey(compositeKey);

    updatingNamesRef.current.add(compositeKey);
    setUpdatingNames((prev) => ({ ...prev, [compositeKey]: true }));

    try {
      await updateContainer(environmentId, name, { pull: true, force: false });
      toast.success(
        t("containers.updateTriggered", { name }),
        t("containers.updateTitle"),
      );
      setChecks((prev) => ({
        ...prev,
        [compositeKey]: {
          status: "done",
          result: { hasUpdate: false, reason: "ok" },
          checkedAt: new Date().toISOString(),
        },
      }));
      await qc.invalidateQueries({
        queryKey: ["docker", "containers", environmentId],
      });
    } catch (e: any) {
      toast.error(
        e?.message ?? t("containers.updateError", { name }),
        t("containers.updateTitle"),
      );
    } finally {
      updatingNamesRef.current.delete(compositeKey);
      setUpdatingNames((prev) => {
        const next = { ...prev };
        delete next[compositeKey];
        return next;
      });
    }
  }

  async function handleCheckAll() {
    if (busy || filteredContainers.length === 0) return;

    const targetEnvIds = Array.from(
      new Set(
        filteredContainers
          .map((c) => c.environmentId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    setBusy({ kind: "checkAll", progressText: t("dashboard.busy.checkingAll") });
    setChecks((prev) => {
      const next = { ...prev };
      for (const c of filteredContainers) {
        if (c.compositeKey) next[c.compositeKey] = { status: "checking" };
      }
      return next;
    });

    let totalScanned = 0;
    let totalUpdates = 0;
    let totalErrors = 0;

    try {
      for (const environmentId of targetEnvIds) {
        const result = await scanAndEnqueue(environmentId, "scan_only");
        const checkedAt = new Date().toISOString();
        totalScanned += result.scanned;

        for (const item of result.results) {
          const key = `${environmentId}:${item.name}`;
          if (isCompletedScanResult(item)) {
            if (item.hasUpdate) totalUpdates += 1;
            setChecks((prev) => ({
              ...prev,
              [key]: { status: "done", result: item, checkedAt },
            }));
          } else {
            totalErrors += 1;
            setChecks((prev) => ({
              ...prev,
              [key]: {
                status: "error",
                error: item.error || t("containers.updateCheckError"),
              },
            }));
          }
        }
      }

      const message =
        totalErrors > 0
          ? t("containers.checkAllPartialError", {
              count: totalScanned,
              updates: totalUpdates,
              errors: totalErrors,
            })
          : t("containers.checkAllSuccess", {
              count: totalScanned,
              updates: totalUpdates,
            });

      if (totalErrors > 0) {
        toast.error(message, t("containers.updateCheckTitle"));
      } else {
        toast.success(message, t("containers.updateCheckTitle"));
      }

      await refetchAll();
    } catch (e: any) {
      toast.error(
        e?.message ?? t("containers.updateCheckError"),
        t("containers.updateCheckTitle"),
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleUpdateSelected() {
    if (busy || !anySelected) return;

    const allowed = selectedContainers.filter((c) =>
      getAllowAutoUpdateFromLabels(c.labels),
    );
    const blocked = selectedContainers.filter(
      (c) => !getAllowAutoUpdateFromLabels(c.labels),
    );

    if (blocked.length > 0) {
      toast.info(
        t("containers.selectAutoUpdateIgnored", {
          count: blocked.length,
          names: formatList(blocked.map((c) => `${c.name} (${c.environmentName})`)),
        }),
        t("common.states.autoUpdateOff"),
      );
    }

    if (allowed.length === 0) {
      toast.info(t("containers.selectNothingAllowed"), t("containers.nothingToDo"));
      return;
    }

    const ok = await confirm.confirm({
      title: t("containers.confirmUpdateSelectedTitle"),
      description: t("containers.confirmUpdateSelectedDescription", {
        count: allowed.length,
        names: formatList(allowed.map((c) => `${c.name} (${c.environmentName})`)),
      }),
      confirmText: t("containers.confirmUpdateSelectedAction"),
      cancelText: t("common.actions.cancel"),
    });

    if (!ok) return;

    setBusy({
      kind: "updateSelected",
      progressText: t("dashboard.busy.updatingSelected"),
    });

    for (let i = 0; i < allowed.length; i++) {
      const c = allowed[i];
      const key = c.compositeKey!;
      const envId = c.environmentId ?? "local";
      setBusy({
        kind: "updateSelected",
        progressText: t("dashboard.busy.updatingContainer", {
          name: `${c.name} (${c.environmentName})`,
          current: i + 1,
          total: allowed.length,
        }),
      });

      try {
        await updateContainer(envId, c.name, { pull: true, force: false });
        toast.success(
          t("containers.updateTriggered", { name: `${c.name} (${c.environmentName})` }),
          t("containers.updateTitle"),
        );
        setChecks((prev) => ({
          ...prev,
          [key]: {
            status: "done",
            result: { hasUpdate: false, reason: "ok" },
            checkedAt: new Date().toISOString(),
          },
        }));
      } catch (e: any) {
        const msg = e?.message ?? t("containers.updateError", { name: c.name });
        toast.error(msg, t("containers.updateTitle"));
        setChecks((prev) => ({
          ...prev,
          [key]: { status: "error", error: msg },
        }));
      }
    }

    await refetchAll();
    setBusy(null);
  }

  async function handleScanAndUpdate() {
    if (busy || filteredContainers.length === 0) return;

    const ok = await confirm.confirm({
      title: t("containers.scanAndQueueConfirmTitle"),
      description: t("containers.scanAndQueueConfirmDescription"),
      confirmText: t("common.actions.execute"),
      cancelText: t("common.actions.cancel"),
    });

    if (!ok) return;

    const targetEnvIds = Array.from(
      new Set(
        filteredContainers
          .map((c) => c.environmentId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    setBusy({
      kind: "scanAndUpdate",
      progressText: t("dashboard.busy.scanAndUpdate"),
    });

    try {
      for (const environmentId of targetEnvIds) {
        await scanAndEnqueue(environmentId, "scan_and_update");
      }
      toast.success(t("containers.queueSuccess"), t("containers.queueTitle"));
      await refetchAll();
    } catch (e: any) {
      toast.error(
        e?.message ?? t("containers.scanAndUpdateError"),
        t("containers.queueTitle"),
      );
    } finally {
      setBusy(null);
    }
  }

  return {
    containers: filteredContainers,
    allContainersCount: allContainers.length,
    loading,
    envFilter,
    setEnvFilter,
    searchQuery,
    setSearchQuery,
    selected,
    selectedKeys,
    allSelected,
    anySelected,
    selectedBlocked,
    busy,
    updatingNames,
    checks,
    detailsKey,
    setDetailsKey,
    detailsQuery,
    refetchAll,
    toggleAll,
    toggleOne,
    runUpdateCheckOne,
    handleUpdateOne,
    handleCheckAll,
    handleUpdateSelected,
    handleScanAndUpdate,
  };
}
