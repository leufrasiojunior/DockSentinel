import * as React from "react";

import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { cn } from "../../../lib/utils";
import { StatusBadge } from "../../../components/product/status-badge";
import { type SchedulerRuntime } from "../api/scheduler";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString();
}

function BoolBadge({ value }: { value: boolean }) {
  return <StatusBadge value={value} />;
}

interface RuntimeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  rt: SchedulerRuntime | null;
}

export function RuntimeCard({ rt, className, ...props }: RuntimeCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader
        title="Runtime"
        subtitle="Status em tempo real do job e do último ciclo."
        right={
          rt ? (
            rt.ticking ? <Badge variant="info">ticking</Badge> : <Badge variant="success">idle</Badge>
          ) : (
            <Badge variant="neutral">—</Badge>
          )
        }
      />

      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="border-border/60 bg-muted/25 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">hasJob</div>
            <div className="mt-2">{rt ? <BoolBadge value={rt.hasJob} /> : "—"}</div>
          </Card>

          <Card className="border-border/60 bg-muted/25 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">enabled</div>
            <div className="mt-2">{rt ? <BoolBadge value={rt.enabled} /> : "—"}</div>
          </Card>
        </div>

        <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Timezone</div>
          <div className="mt-2 break-all font-mono text-sm text-foreground">{rt?.timeZone ?? "UTC"}</div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-foreground">Execuções</div>
            <div>{rt ? <BoolBadge value={rt.ticking} /> : "—"}</div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground">Próxima execução</div>
              <div className="text-right text-foreground">{fmt(rt?.nextScanAt ?? null)}</div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground">Último início</div>
              <div className="text-right text-foreground">{fmt(rt?.lastRunAt ?? null)}</div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground">Último fim</div>
              <div className="text-right text-foreground">{fmt(rt?.lastFinishedAt ?? null)}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-foreground">Último erro</div>
          <div className="mt-2 whitespace-pre-wrap break-words rounded-3xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground">
            {rt?.lastError ?? "—"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
