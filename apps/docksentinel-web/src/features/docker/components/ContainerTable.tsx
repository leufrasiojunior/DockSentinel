import { useState } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { Card, CardContent, CardHeader } from "../../../shared/components/ui/Card";
import { Checkbox } from "../../../components/ui/checkbox";
import { StatusBadge } from "../../../components/product/status-badge";
import { ContainerIcon } from "./ContainerIcon";
import { splitImageRef } from "../utils/image";
import { getAllowAutoUpdateFromLabels, type DockerContainer } from "../api/docker";
import { type BusyState, type CheckState } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { ActionBar } from "@/components/product/action-bar";

interface ContainerTableProps {
  containers: DockerContainer[];
  loading: boolean;
  selected: Record<string, boolean>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (name: string) => void;
  onDetails: (id: string) => void;
  onCheck: (name: string) => void;
  onUpdate: (name: string) => void;
  onRefetch: () => Promise<unknown>;
  onCheckAll: () => void | Promise<void>;
  onUpdateSelected: () => void | Promise<void>;
  onScanOnly: () => void | Promise<void>;
  onScanAndUpdate: () => void | Promise<void>;
  activeDetailsId: string | null;
  isDetailsLoading: boolean;
  updatingNames: Record<string, boolean>;
  checks: Record<string, CheckState>;
  busy: BusyState;
  anySelected: boolean;
  selectedBlockedCount: number;
}

export function ContainerTable({
  containers,
  loading,
  selected,
  allSelected,
  onToggleAll,
  onToggleOne,
  onDetails,
  onCheck,
  onUpdate,
  onRefetch,
  onCheckAll,
  onUpdateSelected,
  onScanOnly,
  onScanAndUpdate,
  activeDetailsId,
  isDetailsLoading,
  updatingNames,
  checks,
  busy,
  anySelected,
  selectedBlockedCount,
}: ContainerTableProps) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isBusy = !!busy;
  const isCheckAllBusy = busy?.kind === "checkAll";
  const isUpdateSelectedBusy = busy?.kind === "updateSelected";
  const isScanOnlyBusy = busy?.kind === "scanOnly";
  const isScanAndUpdateBusy = busy?.kind === "scanAndUpdate";

  async function handleReload() {
    if (loading || isBusy || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  function renderUpdateBadge(name: string, labels: Record<string, string>) {
    const allow = getAllowAutoUpdateFromLabels(labels);
    const st = checks[name];

    if (!allow) return <Badge tone="gray">{t("common.states.autoUpdateOff")}</Badge>;
    if (!st || st.status === "idle")
      return <Badge tone="gray">{t("common.states.notChecked")}</Badge>;
    if (st.status === "checking") return <Badge tone="blue">{t("common.states.checking")}</Badge>;
    if (st.status === "error") return <Badge tone="red">{t("toast.error")}</Badge>;

    if (st.result.hasUpdate === true)
      return <Badge tone="yellow">{t("common.states.updateAvailable")}</Badge>;
    if (st.result.hasUpdate === false)
      return <Badge tone="green">{t("common.states.upToDate")}</Badge>;
    return <Badge tone="gray">{t("common.states.checked")}</Badge>;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-[0.02em] text-foreground">
                {t("containers.tableTitle", { count: containers.length })}
              </div>
              <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t("containers.tableSubtitle").split("docksentinel.update=false")[0]}
                <span className="font-mono">docksentinel.update=false</span>.
              </div>
            </div>
            <ActionBar className="justify-end">
              <Button onClick={handleReload} disabled={loading || isBusy || isRefreshing} type="button" variant="outline">
                {isRefreshing ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                {t("common.actions.reload")}
              </Button>

              <Button
                onClick={onScanOnly}
                disabled={loading || isBusy}
                type="button"
                variant="secondary"
                aria-busy={isScanOnlyBusy}
                title={t("dashboard.manualScanTitle")}
              >
                {isScanOnlyBusy ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {t("dashboard.scan")}
              </Button>

              <Button
                variant="primary"
                onClick={onScanAndUpdate}
                disabled={loading || isBusy}
                type="button"
                aria-busy={isScanAndUpdateBusy}
                title={t("dashboard.scanAndEnqueueTitle")}
              >
                {isScanAndUpdateBusy ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {t("dashboard.scanAndEnqueue")}
              </Button>

              <Button
                onClick={onCheckAll}
                disabled={loading || isBusy || containers.length === 0}
                type="button"
                variant="secondary"
                aria-busy={isCheckAllBusy}
              >
                {isCheckAllBusy ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {t("dashboard.checkAll")}
              </Button>

              <Button
                variant="primary"
                onClick={onUpdateSelected}
                disabled={loading || isBusy || !anySelected}
                type="button"
                aria-busy={isUpdateSelectedBusy}
                title={selectedBlockedCount > 0 ? t("dashboard.selectedBlockedTitle") : undefined}
              >
                {isUpdateSelectedBusy ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {t("dashboard.updateSelected")}
              </Button>
            </ActionBar>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">
              <div className="flex justify-center">
                <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleAll}
                disabled={containers.length === 0}
                />
              </div>
            </TableHead>
            <TableHead className="text-left">{t("containers.columns.container")}</TableHead>
            <TableHead className="text-left">{t("containers.columns.image")}</TableHead>
            <TableHead className="text-left">{t("containers.columns.state")}</TableHead>
            <TableHead className="text-left">{t("containers.columns.update")}</TableHead>
            <TableHead className="text-left">{t("containers.columns.actions")}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {t("containers.loading")}
              </TableCell>
            </TableRow>
          )}

          {!loading && containers.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {t("containers.empty")}
              </TableCell>
            </TableRow>
          )}

          {containers.map((c) => {
            const allowAutoUpdate = getAllowAutoUpdateFromLabels(c.labels);
            const img = splitImageRef(c.image);
            const checkState = checks[c.name];
            const isUpdating = !!updatingNames[c.name];
            const isChecking = checkState?.status === "checking";
            const isOpeningDetails = activeDetailsId === c.id && isDetailsLoading;

            return (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex justify-center">
                    <Checkbox
                    checked={!!selected[c.name]}
                    onCheckedChange={() => onToggleOne(c.name)}
                    />
                  </div>
                </TableCell>

                <TableCell className="text-left">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-border/60 bg-muted/40 p-2">
                      <ContainerIcon imageRepo={img.repo} containerName={c.name} />
                    </div>

                    <div>
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate max-w-50">
                        {c.id.slice(0, 12)}
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-left">
                  <div className="font-mono text-xs text-foreground truncate max-w-400px">
                    {img.repo}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone="gray">{img.tag || t("common.states.noTag")}</Badge>
                    {!allowAutoUpdate && <Badge tone="red">{t("containers.blocked")}</Badge>}
                  </div>
                </TableCell>

                <TableCell className="text-left">
                  <div className="font-medium text-foreground">
                    <StatusBadge value={c.state} />
                  </div>
                  <div className="text-xs text-muted-foreground">{c.status}</div>
                </TableCell>

                <TableCell className="text-left">
                  {renderUpdateBadge(c.name, c.labels)}
                  {checkState?.status === "error" && (
                    <div className="mt-1 text-[11px] text-red-500">
                      {checkState.error}
                    </div>
                  )}
                </TableCell>

                <TableCell className="text-left">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDetails(c.id)}
                      disabled={isBusy || isOpeningDetails}
                      type="button"
                      aria-busy={isOpeningDetails}
                    >
                      {isOpeningDetails ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                      {t("common.actions.details")}
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onCheck(c.name)}
                      disabled={isBusy || isChecking}
                      type="button"
                      aria-busy={isChecking}
                    >
                      {isChecking ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                      {t("common.actions.check")}
                    </Button>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onUpdate(c.name)}
                      disabled={isBusy || !allowAutoUpdate || isUpdating}
                      type="button"
                      aria-busy={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <LoaderCircle className="size-3.5 animate-spin" />
                          {t("common.actions.updating")}
                        </>
                      ) : (
                        t("common.actions.update")
                      )}
                    </Button>
                  </div>

                  {!allowAutoUpdate && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {t("common.states.blockedByLabel")}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
