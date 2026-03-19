import { Badge } from "../../../shared/components/ui/Badge";
import { Card, CardContent, CardHeader } from "../../../shared/components/ui/Card";
import { StatusBadge } from "../../../components/product/status-badge";
import { type SchedulerRuntime } from "../api/scheduler";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function BoolBadge({
  value,
}: {
  value: boolean;
}) {
  return <StatusBadge value={value} />;
}

interface RuntimeCardProps {
  rt: SchedulerRuntime | null;
}

export function RuntimeCard({ rt }: RuntimeCardProps) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader
        title="Runtime"
        subtitle="Status em tempo real"
        right={
          rt ? (
            rt.ticking ? <Badge tone="blue">ticking</Badge> : <Badge tone="green">idle</Badge>
          ) : (
            <Badge tone="gray">—</Badge>
          )
        }
      />

      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="border-border/60 bg-muted/25 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">hasJob</div>
            <div className="mt-2">{rt ? <BoolBadge value={!!rt.hasJob} /> : "—"}</div>
          </Card>
          <Card className="border-border/60 bg-muted/25 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">enabled</div>
            <div className="mt-2">{rt ? <BoolBadge value={!!rt.enabled} /> : "—"}</div>
          </Card>
        </div>

        <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-foreground">Ticking status</div>
            <div>{rt ? <BoolBadge value={!!rt.ticking} /> : "—"}</div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground">nextScanAt</div>
              <div className="text-right text-foreground">{fmt(rt?.nextScanAt ?? null)}</div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground">lastFinishedAt</div>
              <div className="text-right text-foreground">{fmt(rt?.lastFinishedAt ?? null)}</div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground">lastRunAt</div>
              <div className="text-right text-foreground">{fmt(rt?.lastRunAt ?? null)}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-foreground">lastError</div>
          <div className="mt-2 rounded-3xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground whitespace-pre-wrap break-words">
            {rt?.lastError ?? "—"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
