import { useTranslation } from "react-i18next";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { Card, CardContent, CardHeader } from "../../../shared/components/ui/Card";
import { Checkbox } from "../../../components/ui/checkbox";
import { StatusBadge } from "../../../components/product/status-badge";
import { ContainerIcon } from "./ContainerIcon";
import { splitImageRef } from "../utils/image";
import { getAllowAutoUpdateFromLabels, type DockerContainer } from "../api/docker";
import { type CheckState } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";

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
  checks: Record<string, CheckState>;
  busy: boolean;
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
  checks,
  busy,
}: ContainerTableProps) {
  const { t } = useTranslation();

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
      <CardHeader
        title={t("containers.tableTitle", { count: containers.length })}
        subtitle={
          <>
            {t("containers.tableSubtitle").split("docksentinel.update=false")[0]}
            <span className="font-mono">docksentinel.update=false</span>.
          </>
        }
        right={<Badge tone="blue">{t("common.states.livePolling")}</Badge>}
      />

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
                      <div className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                        {c.id.slice(0, 12)}
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-left">
                  <div className="font-mono text-xs text-foreground truncate max-w-[400px]">
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
                      disabled={busy}
                      type="button"
                    >
                      {t("common.actions.details")}
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onCheck(c.name)}
                      disabled={busy}
                      type="button"
                    >
                      {t("common.actions.check")}
                    </Button>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onUpdate(c.name)}
                      disabled={busy || !allowAutoUpdate}
                      type="button"
                    >
                      {t("common.actions.update")}
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
