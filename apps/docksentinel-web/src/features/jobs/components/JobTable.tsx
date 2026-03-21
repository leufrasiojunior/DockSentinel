import { useTranslation } from "react-i18next";
import { Badge } from "../../../shared/components/ui/Badge";
import { StatusBadge } from "../../../components/product/status-badge";
import { formatDateTime } from "../../../i18n/format";
import { type UpdateJob } from "../api/jobs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  return formatDateTime(iso) ?? "—";
}

interface JobTableProps {
  jobs: UpdateJob[];
  loading: boolean;
}

export function JobTable({ jobs, loading }: JobTableProps) {
  const { t } = useTranslation();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-left">{t("common.labels.status")}</TableHead>
          <TableHead className="text-left">{t("common.labels.container")}</TableHead>
          <TableHead className="text-left">{t("common.labels.image")}</TableHead>
          <TableHead className="text-left">{t("common.labels.timestamps")}</TableHead>
          <TableHead className="text-left">{t("common.labels.lock")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {loading && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                {t("jobs.table.loading")}
              </TableCell>
            </TableRow>
          )}

        {!loading && jobs.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                {t("jobs.table.empty")}
              </TableCell>
            </TableRow>
          )}

        {jobs.map((j: UpdateJob) => (
          <TableRow key={j.id}>
            <TableCell className="text-left">
              <div className="flex items-center gap-2">
                <StatusBadge value={j.status} />
                <div className="text-[11px] text-muted-foreground font-mono">
                  {j.id.slice(0, 8)}
                </div>
              </div>
              {j.error && (
                <div className="mt-1 text-xs text-red-500">{j.error}</div>
              )}
            </TableCell>

            <TableCell className="text-left">
              <div className="font-medium text-foreground">
                {j.container ?? "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                <Badge tone={j.pull ? "green" : "gray"}>{j.pull ? "pull" : t("common.states.noPull")}</Badge>
                {" "}
                <Badge tone={j.force ? "yellow" : "gray"}>{j.force ? "force" : t("common.states.safe")}</Badge>
              </div>
            </TableCell>

            <TableCell className="text-left">
              <div className="font-mono text-xs text-foreground max-w-[400px] truncate">
                {j.image ?? "—"}
              </div>
            </TableCell>

            <TableCell className="text-left">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>{t("jobs.table.created")}: {fmt(j.createdAt)}</div>
                <div>{t("jobs.table.start")}: {fmt(j.startedAt)}</div>
                <div>{t("jobs.table.end")}: {fmt(j.finishedAt ?? null)}</div>
              </div>
            </TableCell>

            <TableCell className="text-left">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>{t("jobs.table.lockedAt")}: {fmt(j.lockedAt ?? null)}</div>
                <div className="font-mono truncate max-w-[200px]">
                  {t("jobs.table.lockedBy")}: {j.lockedBy ?? "—"}
                </div>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
