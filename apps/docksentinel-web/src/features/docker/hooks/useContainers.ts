import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useContainers() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const containersQuery = useQuery({
    queryKey: ["docker", "containers"],
    queryFn: listContainers,
    refetchInterval: 10_000,
  });

  const containers = Array.isArray(containersQuery.data)
    ? containersQuery.data
    : [];

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [busy, setBusy] = useState<BusyState>(null);

  // Modal: container selecionado para detalhes
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const detailsQuery = useQuery({
    queryKey: ["docker", "containers", "details", detailsId],
    queryFn: async () => {
      const id = detailsId!;
      return (await getContainerDetails(id)) as ContainerDetails;
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
      const result = await updateCheck(name);
      setChecks((prev) => ({
        ...prev,
        [name]: { status: "done", result, checkedAt: new Date().toISOString() },
      }));
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao checar updates";
      setChecks((prev) => ({
        ...prev,
        [name]: { status: "error", error: msg },
      }));
      toast.error(msg, "Update check");
    }
  }

  async function handleCheckAll() {
    if (busy) return;
    if (!Array.isArray(containers) || containers.length === 0) return;

    setBusy({ kind: "checkAll", progressText: "Checando containers..." });

    setChecks((prev) => {
      const next = { ...prev };
      for (const c of containers) next[c.name] = { status: "checking" };
      return next;
    });

    const results = await Promise.allSettled(
      containers.map((c) => updateCheck(c.name)),
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
            error: (r.reason as any)?.message ?? "Erro ao checar",
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
        `Ignorando ${blocked.length} bloqueado(s): ${blocked.map((c) => c.name).join(", ")}`,
        "Auto-update OFF",
      );
    }

    if (allowed.length === 0) {
      toast.info("Nenhum selecionado permitido para update.", "Nada a fazer");
      return;
    }

    const ok = await confirm.confirm({
      title: "Atualizar selecionados?",
      description:
        `Você vai iniciar update em ${allowed.length} container(s).\n\n` +
        `Selecionados: ${allowed.map((c) => c.name).join(", ")}`,
      confirmText: "Atualizar agora",
      cancelText: "Cancelar",
    });

    if (!ok) return;

    setBusy({
      kind: "updateSelected",
      progressText: "Atualizando selecionados...",
    });

    for (let i = 0; i < allowed.length; i++) {
      const c = allowed[i];
      setBusy({
        kind: "updateSelected",
        progressText: `Atualizando ${c.name} (${i + 1}/${allowed.length})...`,
      });

      try {
        await updateContainer(c.name, { pull: true, force: false });
        toast.success(`Update disparado: ${c.name}`, "Update");
        await runUpdateCheckOne(c.name);
      } catch (e: any) {
        const msg = e?.message ?? `Erro ao atualizar ${c.name}`;
        toast.error(msg, "Update");
        setChecks((prev) => ({
          ...prev,
          [c.name]: { status: "error", error: msg },
        }));
      }
    }

    await qc.invalidateQueries({ queryKey: ["docker", "containers"] });
    setBusy(null);
  }

  async function handleScanOnly() {
    if (busy) return;

    setBusy({ kind: "scanOnly", progressText: "Executando scan (scan_only)..." });
    try {
      const result = await scanAndEnqueue("scan_only");
      toast.success("Scan concluído.", "Scan");

      if (result && typeof result === "object") {
        const keys = Object.keys(result);
        if (keys.length > 0) {
          toast.info(`Retorno: ${keys.slice(0, 6).join(", ")}...`, "Scan");
        }
      }

      await qc.invalidateQueries({ queryKey: ["docker", "containers"] });
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao executar scan";
      toast.error(msg, "Scan");
    } finally {
      setBusy(null);
    }
  }

  async function handleScanAndUpdate() {
    if (busy) return;

    const ok = await confirm.confirm({
      title: "Scan + enfileirar updates?",
      description:
        "Isso vai rodar o scan e enfileirar jobs para atualizar os containers elegíveis.\n\n" +
        "Containers com label docksentinel.update=false serão ignorados.",
      confirmText: "Executar",
      cancelText: "Cancelar",
    });

    if (!ok) return;

    setBusy({
      kind: "scanAndUpdate",
      progressText: "Executando scan e enfileirando jobs (scan_and_update)...",
    });

    try {
      await scanAndEnqueue("scan_and_update");
      toast.success("Jobs enfileirados com sucesso.", "Scheduler/Queue");
      await qc.invalidateQueries({ queryKey: ["docker", "containers"] });
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao executar scan_and_update";
      toast.error(msg, "Scheduler/Queue");
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
    if (busy) return;
    try {
      await updateContainer(name, { pull: true, force: false });
      toast.success(`Update disparado: ${name}`, "Update");
      await runUpdateCheckOne(name);
    } catch (e: any) {
      toast.error(e?.message ?? `Erro ao atualizar ${name}`, "Update");
    }
  }

  return {
    containers,
    loading: containersQuery.isLoading,
    error: containersQuery.error,
    refetch: containersQuery.refetch,
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
  };
}
