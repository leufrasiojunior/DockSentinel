import { type ReactNode, useState } from "react";
import {
  CircleArrowUp,
  Globe,
  HardDrive,
  HousePlug,
  KeyRound,
  LoaderCircle,
  RefreshCcw,
  TriangleAlert,
} from "lucide-react";
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
import { cn } from "../../../shared/lib/utils/cn";

export type ContainerTableRow = DockerContainer & {
  environmentId?: string;
  environmentName?: string;
  environmentKind?: "local" | "remote";
  compositeKey?: string;
};

type UpdateVisualState =
  | "blocked"
  | "idle"
  | "checking"
  | "error"
  | "localOnly"
  | "authRequired"
  | "rateLimited"
  | "available"
  | "upToDate"
  | "checked";

interface ContainerTableProps {
  containers: ContainerTableRow[];
  loading: boolean;
  selected: Record<string, boolean>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (key: string) => void;
  onDetails: (idOrKey: string) => void;
  onCheck: (key: string) => void;
  onUpdate: (key: string) => void;
  onRefetch: () => Promise<unknown>;
  onCheckAll: () => void | Promise<void>;
  onUpdateSelected: () => void | Promise<void>;
  onScanAndUpdate: () => void | Promise<void>;
  activeDetailsId: string | null;
  isDetailsLoading: boolean;
  updatingNames: Record<string, boolean>;
  checks: Record<string, CheckState>;
  busy: BusyState;
  anySelected: boolean;
  selectedBlockedCount: number;
  showEnvironmentColumn?: boolean;
  filterSlot?: ReactNode;
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
  onScanAndUpdate,
  activeDetailsId,
  isDetailsLoading,
  updatingNames,
  checks,
  busy,
  anySelected,
  selectedBlockedCount,
  showEnvironmentColumn = false,
  filterSlot,
}: ContainerTableProps) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isBusy = !!busy;
  const isCheckAllBusy = busy?.kind === "checkAll";
  const isUpdateSelectedBusy = busy?.kind === "updateSelected";
  const isScanAndUpdateBusy = busy?.kind === "scanAndUpdate";
  const totalCols = showEnvironmentColumn ? 7 : 6;

  async function handleReload() {
    if (loading || isBusy || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  function getUpdateVisualState(
    rowKey: string,
    labels: Record<string, string>,
  ): UpdateVisualState {
    const allow = getAllowAutoUpdateFromLabels(labels);
    const st = checks[rowKey];

    if (!allow) return "blocked";
    if (!st || st.status === "idle") return "idle";
    if (st.status === "checking") return "checking";
    if (st.status === "error") return "error";

    const reason = st.result.reason as string | undefined;
    if (reason === "local_only") return "localOnly";
    if (reason === "registry_auth_required") return "authRequired";
    if (reason === "registry_rate_limited") return "rateLimited";
    if (reason === "remote_digest_error") return "error";

    if (st.result.hasUpdate === true) return "available";
    if (st.result.hasUpdate === false) return "upToDate";
    return "checked";
  }

  function renderUpdateBadge(state: UpdateVisualState) {
    if (state === "blocked")
      return (
        <Badge tone="gray" className="rounded-full text-[0.68rem]">
          {t("common.states.autoUpdateOff")}
        </Badge>
      );
    if (state === "idle")
      return (
        <Badge tone="gray" className="rounded-full text-[0.68rem]">
          {t("common.states.notChecked")}
        </Badge>
      );
    if (state === "checking") {
      return (
        <Badge tone="blue" className="gap-1.5 rounded-full text-[0.68rem]">
          <LoaderCircle className="size-3.5 animate-spin" />
          {t("common.states.checking")}
        </Badge>
      );
    }
    if (state === "localOnly") {
      return (
        <Badge
          tone="gray"
          className="gap-1.5 rounded-full text-[0.68rem] border-white/10 bg-white/5 text-slate-300"
        >
          <HardDrive className="size-3.5" />
          {t("common.states.localImage")}
        </Badge>
      );
    }
    if (state === "authRequired") {
      return (
        <Badge
          tone="yellow"
          className="gap-1.5 rounded-full text-[0.68rem] border-amber-500/30 bg-amber-500/15 text-amber-300"
        >
          <KeyRound className="size-3.5" />
          {t("common.states.registryAuthRequired")}
        </Badge>
      );
    }
    if (state === "rateLimited") {
      return (
        <Badge
          tone="red"
          className="gap-1.5 rounded-full text-[0.68rem] border-rose-500/30 bg-rose-500/15 text-rose-300"
        >
          <TriangleAlert className="size-3.5" />
          {t("common.states.rateLimited")}
        </Badge>
      );
    }
    if (state === "error") {
      return (
        <Badge
          tone="red"
          className="gap-1.5 rounded-full text-[0.68rem] border-rose-500/30 bg-rose-500/15 text-rose-300"
        >
          <TriangleAlert className="size-3.5" />
          {t("toast.error")}
        </Badge>
      );
    }
    if (state === "available") {
      return (
        <Badge
          tone="yellow"
          className="gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[0.68rem] font-semibold text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.2)]"
        >
          <CircleArrowUp className="size-3.5 text-amber-400" />
          {t("common.states.updateAvailable")}
        </Badge>
      );
    }
    if (state === "upToDate")
      return (
        <Badge
          tone="green"
          className="gap-1.5 rounded-full text-[0.68rem] border-emerald-500/30 bg-emerald-500/15 text-emerald-300 font-semibold"
        >
          {t("common.states.upToDate")}
        </Badge>
      );
    return (
      <Badge tone="gray" className="rounded-full text-[0.68rem]">
        {t("common.states.checked")}
      </Badge>
    );
  }

  return (
    <Card className="overflow-hidden rounded-3xl border border-white/8 bg-card/90 shadow-xl backdrop-blur-xl">
      <CardHeader className="gap-4">
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-base font-bold tracking-tight text-white">
                {t("containers.tableTitle", { count: containers.length })}
              </div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
                {t("containers.tableSubtitle").split("docksentinel.update=false")[0]}
                <span className="font-mono text-violet-300/80">docksentinel.update=false</span>.
              </div>
            </div>
            <ActionBar className="justify-end gap-2">
              <Button
                onClick={handleReload}
                disabled={loading || isBusy || isRefreshing}
                type="button"
                variant="glass"
                className="rounded-xl"
              >
                {isRefreshing ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                {t("common.actions.reload")}
              </Button>

              <Button
                onClick={onCheckAll}
                disabled={loading || isBusy || containers.length === 0}
                type="button"
                variant="secondary"
                aria-busy={isCheckAllBusy}
                className="rounded-xl border border-white/8 bg-white/[0.04] text-foreground hover:bg-white/[0.08]"
              >
                {isCheckAllBusy ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {t("dashboard.checkAll")}
              </Button>

              <Button
                variant="highlight"
                onClick={onScanAndUpdate}
                disabled={loading || isBusy}
                type="button"
                aria-busy={isScanAndUpdateBusy}
                title={t("dashboard.scanAndEnqueueTitle")}
                className="rounded-xl gap-2 font-semibold"
              >
                {isScanAndUpdateBusy ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {t("dashboard.scanAndEnqueue")}
              </Button>

              <Button
                variant="primary"
                onClick={onUpdateSelected}
                disabled={loading || isBusy || !anySelected}
                type="button"
                aria-busy={isUpdateSelectedBusy}
                title={selectedBlockedCount > 0 ? t("dashboard.selectedBlockedTitle") : undefined}
                className="rounded-xl font-medium bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-600/20"
              >
                {isUpdateSelectedBusy ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {t("dashboard.updateSelected")}
              </Button>
            </ActionBar>
          </div>

          {filterSlot ? <div>{filterSlot}</div> : null}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/8 hover:bg-transparent">
              <TableHead className="w-14">
                <div className="flex justify-center">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onToggleAll}
                    disabled={containers.length === 0}
                  />
                </div>
              </TableHead>
              <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{t("containers.columns.container")}</TableHead>
              {showEnvironmentColumn ? (
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{t("containers.columns.environment")}</TableHead>
              ) : null}
              <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{t("containers.columns.image")}</TableHead>
              <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{t("containers.columns.state")}</TableHead>
              <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{t("containers.columns.update")}</TableHead>
              <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{t("containers.columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={totalCols} className="h-24 text-center text-muted-foreground">
                  {t("containers.loading")}
                </TableCell>
              </TableRow>
            )}

            {!loading && containers.length === 0 && (
              <TableRow>
                <TableCell colSpan={totalCols} className="h-24 text-center text-muted-foreground">
                  {t("containers.empty")}
                </TableCell>
              </TableRow>
            )}

            {containers.map((c) => {
              const rowKey = c.compositeKey ?? c.name;
              const detailsKey = c.compositeKey && c.environmentId
                ? `${c.environmentId}:${c.id}`
                : c.id;
              const allowAutoUpdate = getAllowAutoUpdateFromLabels(c.labels);
              const img = splitImageRef(c.image);
              const checkState = checks[rowKey];
              const isUpdating = !!updatingNames[rowKey];
              const isChecking = checkState?.status === "checking";
              const isOpeningDetails = activeDetailsId === detailsKey && isDetailsLoading;
              const updateState = getUpdateVisualState(rowKey, c.labels);
              const isLocalOnly = updateState === "localOnly";

              return (
                <TableRow
                  key={c.compositeKey ? `${c.compositeKey}:${c.id}` : c.id}
                  className={cn(
                    "border-b border-white/5 transition-colors",
                    updateState === "available" && "bg-amber-500/5 hover:bg-amber-500/10",
                    isUpdating && "bg-violet-600/10 hover:bg-violet-600/15",
                  )}
                >
                  <TableCell>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={!!selected[rowKey]}
                        onCheckedChange={() => onToggleOne(rowKey)}
                      />
                    </div>
                  </TableCell>

                  <TableCell className="text-left">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-violet-300 shadow-sm">
                        <ContainerIcon imageRepo={img.repo} containerName={c.name} />
                      </div>

                      <div>
                        <div className="font-semibold text-white tracking-tight">{c.name}</div>
                        <div className="text-xs text-muted-foreground/75 font-mono truncate max-w-50">
                          {c.id.slice(0, 12)}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {showEnvironmentColumn ? (
                    <TableCell className="text-left">
                      <Badge
                        tone={c.environmentKind === "local" ? "blue" : "gray"}
                        className="gap-1.5 rounded-full text-xs"
                      >
                        {c.environmentKind === "local" ? (
                          <HousePlug className="size-3.5" />
                        ) : (
                          <Globe className="size-3.5" />
                        )}
                        {c.environmentName ?? c.environmentId ?? "Local"}
                      </Badge>
                    </TableCell>
                  ) : null}

                  <TableCell className="text-left">
                    <div className="font-mono text-xs text-slate-200 truncate max-w-400px">
                      {img.repo}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone="gray" className="rounded-full text-[0.68rem]">{img.tag || t("common.states.noTag")}</Badge>
                      {!allowAutoUpdate && <Badge tone="red" className="rounded-full text-[0.68rem]">{t("containers.blocked")}</Badge>}
                    </div>
                  </TableCell>

                  <TableCell className="text-left">
                    <div className="font-medium text-foreground">
                      <StatusBadge value={c.state} />
                    </div>
                    <div className="text-xs text-muted-foreground/70 font-mono mt-0.5">{c.status}</div>
                  </TableCell>

                  <TableCell
                    className={cn(
                      "text-left",
                      updateState === "available" && "border-l-2 border-l-amber-500/70 bg-amber-500/8",
                      isUpdating && "border-l-2 border-l-violet-500/70 bg-violet-600/10",
                    )}
                  >
                    {renderUpdateBadge(updateState)}
                    {isUpdating && (
                      <div className="mt-1 text-[11px] font-medium text-violet-400 flex items-center gap-1">
                        <LoaderCircle className="size-3 animate-spin" />
                        {t("common.actions.updating")}
                      </div>
                    )}
                    {checkState?.status === "error" && (
                      <div className="mt-1 text-[11px] text-rose-400">
                        {checkState.error}
                      </div>
                    )}
                    {checkState?.status === "done" &&
                      typeof checkState.result.error === "string" &&
                      checkState.result.error.length > 0 && (
                        <div className="mt-1 text-[11px] text-rose-400">
                          {checkState.result.error}
                        </div>
                      )}
                  </TableCell>

                  <TableCell className="text-left">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="glass"
                        onClick={() => onDetails(detailsKey)}
                        disabled={isBusy || isOpeningDetails}
                        type="button"
                        aria-busy={isOpeningDetails}
                        className="rounded-xl text-xs"
                      >
                        {isOpeningDetails ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                        {t("common.actions.details")}
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onCheck(rowKey)}
                        disabled={isBusy || isChecking}
                        type="button"
                        aria-busy={isChecking}
                        className="rounded-xl text-xs border border-white/8 bg-white/[0.03] hover:bg-white/[0.08]"
                      >
                        {isChecking ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                        {t("common.actions.check")}
                      </Button>

                      <Button
                        size="sm"
                        variant="highlight"
                        onClick={() => onUpdate(rowKey)}
                        disabled={isBusy || !allowAutoUpdate || isUpdating || isLocalOnly}
                        type="button"
                        aria-busy={isUpdating}
                        className="min-w-24 rounded-xl text-xs font-semibold"
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
                      <div className="mt-1 text-[11px] text-muted-foreground/75 font-mono">
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
