import { Badge } from "../../../shared/components/ui/Badge";
import { Card, CardHeader } from "../../../shared/components/ui/Card";
import { type SchedulerRuntime } from "../api/scheduler";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function BoolBadge({
  value,
  toneTrue,
  toneFalse,
}: {
  value: boolean;
  toneTrue: any;
  toneFalse: any;
}) {
  return value ? (
    <Badge tone={toneTrue}>true</Badge>
  ) : (
    <Badge tone={toneFalse}>false</Badge>
  );
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
            <Badge>—</Badge>
          )
        }
      />

      <div className="p-4 text-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-gray-600">hasJob</div>
          <div>{rt ? <BoolBadge value={!!rt.hasJob} toneTrue="blue" toneFalse="gray" /> : "—"}</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-gray-600">enabled (runtime)</div>
          <div>{rt ? <BoolBadge value={!!rt.enabled} toneTrue="green" toneFalse="gray" /> : "—"}</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-gray-600">ticking</div>
          <div>{rt ? <BoolBadge value={!!rt.ticking} toneTrue="blue" toneFalse="gray" /> : "—"}</div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-muted-foreground">nextScanAt</div>
          <div className="text-foreground">{fmt(rt?.nextScanAt ?? null)}</div>
          </div>

          <div className="rounded-lg border p-3 text-sm">
          <div className="text-muted-foreground">lastFinishedAt</div>
          <div className="text-foreground">{fmt(rt?.lastFinishedAt ?? null)}</div>
          </div>


        <div>
          <div className="text-gray-600">lastError</div>
          <div className="mt-1 text-xs text-gray-800 whitespace-pre-wrap wrap-break-word">
            {rt?.lastError ?? "—"}
          </div>
        </div>
      </div>
    </Card>
  );
}
