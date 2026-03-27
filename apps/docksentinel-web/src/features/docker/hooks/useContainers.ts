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
import { scanAndEnqueue } from "../../updates/api/updates";
import { useToast } from "../../../shared/components/ui/ToastProvider";
import { useConfirm } from "../../../shared/components/ui/ConfirmProvider";
import { type CheckState, type ContainerDetails, type BusyState } from "../types";
import { formatList } from "../../../i18n/format";
import { useEnvironmentRoute } from "../../environments/hooks/useEnvironmentRoute";

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

    const results = await Promise.allSettled(
      containers.map((c) => updateCheck(environmentId, c.name)),
    );

    setChecks((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => {
        const name = containers[i]?.name;
        if (!name) return;

        if (r.status === "fulfilled") {
          next[name] = {
            status: "done",
            result: r.value,
            checkedAt: new Date().toISOString(),
          };
        } else {
          next[name] = {
            status: "error",
            error: (r.reason as any)?.message ?? t("containers.updateCheckError"),
          };
        }
      });
      return next;
    });

    setBusy(null);
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

  async function handleScanOnly() {
    if (busy) return;

    setBusy({ kind: "scanOnly", progressText: t("dashboard.busy.scanOnly") });
    try {
      const result = await scanAndEnqueue(environmentId, "scan_only");
      toast.success(t("containers.scanDone"), t("containers.scanTitle"));

      if (result && typeof result === "object") {
        const keys = Object.keys(result);
        if (keys.length > 0) {
          toast.info(
            t("containers.scanResponse", { keys: keys.slice(0, 6).join(", ") }),
            t("containers.scanTitle"),
          );
        }
      }

      await qc.invalidateQueries({ queryKey: ["docker", "containers", environmentId] });
    } catch (e: any) {
      const msg = e?.message ?? t("containers.scanError");
      toast.error(msg, t("containers.scanTitle"));
    } finally {
      setBusy(null);
    }
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
    handleScanOnly,
    handleScanAndUpdate,
    runUpdateCheckOne,
    handleUpdateOne,
  };
}
