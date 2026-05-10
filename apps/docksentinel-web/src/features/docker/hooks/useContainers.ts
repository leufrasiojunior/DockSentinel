import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getAllowAutoUpdateFromLabels,
  listContainers,
  updateCheck,
  updateContainer,
  getContainerDetails,
  type DockerContainer,
} from "../api/docker";
import { scanAndEnqueue, type ScanResult, type ScanResultOk } from "../../updates/api/updates";
import { useToast } from "../../../shared/components/ui/ToastProvider";
import { useConfirm } from "../../../shared/components/ui/ConfirmProvider";
import { type CheckState, type ContainerDetails, type BusyState } from "../types";
import { formatList } from "../../../i18n/format";
import { useEnvironmentRoute } from "../../environments/hooks/useEnvironmentRoute";

function isCompletedScanResult(result: ScanResult): result is ScanResultOk {
  return typeof (result as { hasUpdate?: unknown }).hasUpdate === "boolean";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

export function useContainers() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { environmentId } = useEnvironmentRoute();

  const containersQuery = useQuery({
    queryKey: ["docker", "containers", environmentId],
    queryFn: () => listContainers(environmentId),
    refetchInterval: 10_000,
  });

  const containers = Array.isArray(containersQuery.data)
    ? containersQuery.data
    : [];

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [busy, setBusy] = useState<BusyState>(null);
  const [updatingNames, setUpdatingNames] = useState<Record<string, boolean>>({});
  const updatingNamesRef = useRef(new Set<string>());

  // Modal: container selecionado para detalhes
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const detailsQuery = useQuery({
    queryKey: ["docker", "containers", environmentId, "details", detailsId],
    queryFn: async () => {
      const id = detailsId!;
      return (await getContainerDetails(environmentId, id)) as ContainerDetails;
    },
    enabled: !!detailsId,
    retry: false,
  });

  const selectedNames = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected],
  );

  const allSelected = useMemo(() => {
    if (!Array.isArray(containers) || containers.length === 0) return false;
    return containers.every((c) => !!selected[c.name]);
  }, [containers, selected]);

  const anySelected = selectedNames.length > 0;

  const selectedContainers = useMemo(() => {
    const map = new Map(containers.map((c) => [c.name, c] as const));
    return selectedNames
      .map((n) => map.get(n))
      .filter(Boolean) as DockerContainer[];
  }, [containers, selectedNames]);

  const selectedBlocked = useMemo(
    () =>
      selectedContainers.filter((c) => !getAllowAutoUpdateFromLabels(c.labels)),
    [selectedContainers],
  );

  async function runUpdateCheckOne(name: string) {
    setChecks((prev) => ({ ...prev, [name]: { status: "checking" } }));
    try {
      const result = await updateCheck(environmentId, name);
      setChecks((prev) => ({
        ...prev,
        [name]: { status: "done", result, checkedAt: new Date().toISOString() },
      }));
    } catch (e: any) {
      const msg = e?.message ?? t("containers.updateCheckError");
      setChecks((prev) => ({
        ...prev,
        [name]: { status: "error", error: msg },
      }));
      toast.error(msg, t("containers.updateCheckTitle"));
    }
  }

  async function handleCheckAll() {
    if (busy) return;
    if (!Array.isArray(containers) || containers.length === 0) return;

    setBusy({ kind: "checkAll", progressText: t("dashboard.busy.checkingAll") });

    setChecks((prev) => {
      const next = { ...prev };
      for (const c of containers) next[c.name] = { status: "checking" };
      return next;
    });

    try {
      const result = await scanAndEnqueue(environmentId, "scan_only");
      const checkedAt = new Date().toISOString();
      const resultByName = new Map(result.results.map((item) => [item.name, item]));

      setChecks((prev) => {
        const next = { ...prev };
        for (const container of containers) {
          const item = resultByName.get(container.name);
          if (!item) {
            next[container.name] = {
              status: "error",
              error: t("containers.updateCheckError"),
            };
            continue;
          }

          if (isCompletedScanResult(item)) {
            next[container.name] = {
              status: "done",
              result: item,
              checkedAt,
            };
          } else {
            next[container.name] = {
              status: "error",
              error: item.error || t("containers.updateCheckError"),
            };
          }
        }
        return next;
      });

      const updateCount = result.results.filter(
        (item) => isCompletedScanResult(item) && item.hasUpdate,
      ).length;
      const errorCount = result.results.filter((item) => !isCompletedScanResult(item)).length;
      const message =
        errorCount > 0
          ? t("containers.checkAllPartialError", {
              count: result.scanned,
              updates: updateCount,
              errors: errorCount,
            })
          : t("containers.checkAllSuccess", {
              count: result.scanned,
              updates: updateCount,
            });

      if (errorCount > 0) {
        toast.error(message, t("containers.updateCheckTitle"));
      } else {
        toast.success(message, t("containers.updateCheckTitle"));
      }

      await qc.invalidateQueries({ queryKey: ["docker", "containers", environmentId] });
    } catch (error: unknown) {
      const message = getErrorMessage(error, t("containers.updateCheckError"));
      setChecks((prev) => {
        const next = { ...prev };
        for (const container of containers) {
          next[container.name] = { status: "error", error: message };
        }
        return next;
      });
      toast.error(message, t("containers.updateCheckTitle"));
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
          names: formatList(blocked.map((container) => container.name)),
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
        names: formatList(allowed.map((container) => container.name)),
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
      setBusy({
        kind: "updateSelected",
        progressText: t("dashboard.busy.updatingContainer", {
          name: c.name,
          current: i + 1,
          total: allowed.length,
        }),
      });

      try {
        await updateContainer(environmentId, c.name, { pull: true, force: false });
        toast.success(t("containers.updateTriggered", { name: c.name }), t("containers.updateTitle"));
        await runUpdateCheckOne(c.name);
      } catch (e: any) {
        const msg = e?.message ?? t("containers.updateError", { name: c.name });
        toast.error(msg, t("containers.updateTitle"));
        setChecks((prev) => ({
          ...prev,
          [c.name]: { status: "error", error: msg },
        }));
      }
    }

    await qc.invalidateQueries({ queryKey: ["docker", "containers", environmentId] });
    setBusy(null);
  }

  async function handleScanAndUpdate() {
    if (busy) return;

    const ok = await confirm.confirm({
      title: t("containers.scanAndQueueConfirmTitle"),
      description: t("containers.scanAndQueueConfirmDescription"),
      confirmText: t("common.actions.execute"),
      cancelText: t("common.actions.cancel"),
    });

    if (!ok) return;

    setBusy({
      kind: "scanAndUpdate",
      progressText: t("dashboard.busy.scanAndUpdate"),
    });

    try {
      await scanAndEnqueue(environmentId, "scan_and_update");
      toast.success(t("containers.queueSuccess"), t("containers.queueTitle"));
      await qc.invalidateQueries({ queryKey: ["docker", "containers", environmentId] });
    } catch (e: any) {
      const msg = e?.message ?? t("containers.scanAndUpdateError");
      toast.error(msg, t("containers.queueTitle"));
    } finally {
      setBusy(null);
    }
  }

  function toggleAll() {
    const next = !allSelected;
    const obj: Record<string, boolean> = {};
    for (const c of containers) obj[c.name] = next;
    setSelected(obj);
  }

  function toggleOne(name: string) {
    setSelected((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  async function handleUpdateOne(name: string) {
    if (busy || updatingNamesRef.current.has(name)) return;

    updatingNamesRef.current.add(name);
    setUpdatingNames((prev) => ({ ...prev, [name]: true }));

    try {
      await updateContainer(environmentId, name, { pull: true, force: false });
      toast.success(t("containers.updateTriggered", { name }), t("containers.updateTitle"));
      await runUpdateCheckOne(name);
    } catch (e: any) {
      toast.error(e?.message ?? t("containers.updateError", { name }), t("containers.updateTitle"));
    } finally {
      updatingNamesRef.current.delete(name);
      setUpdatingNames((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  return {
    containers,
    loading: containersQuery.isLoading,
    error: containersQuery.error,
    refetch: containersQuery.refetch,
    environmentId,
    selected,
    selectedNames,
    allSelected,
    anySelected,
    selectedBlocked,
    busy,
    updatingNames,
    checks,
    detailsId,
    setDetailsId,
    detailsQuery,
    toggleAll,
    toggleOne,
    handleCheckAll,
    handleUpdateSelected,
    handleScanAndUpdate,
    runUpdateCheckOne,
    handleUpdateOne,
  };
}
