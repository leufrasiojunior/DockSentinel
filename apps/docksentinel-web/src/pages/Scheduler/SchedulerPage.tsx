import { Button } from "../../shared/components/ui/Button";
import { Badge } from "../../shared/components/ui/Badge";
import { Card, CardHeader } from "../../shared/components/ui/Card";
import { Input } from "../../shared/components/ui/Input";
import { Select } from "../../shared/components/ui/Select";
import { useScheduler } from "../../features/scheduler/hooks/useScheduler";
import { RuntimeCard } from "../../features/scheduler/components/RuntimeCard";
import { CronBuilder } from "../../features/scheduler/components/CronBuilder";
import { type SchedulerMode, type SchedulerScope } from "../../features/scheduler/api/scheduler";

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

export function SchedulerPage() {
  const {
    cfg,
    rt,
    loading,
    isFetching,
    refetch,
    enabled,
    setEnabled,
    mode,
    setMode,
    scope,
    setScope,
    scanLabelKey,
    setScanLabelKey,
    updateLabelKey,
    setUpdateLabelKey,
    cronManual,
    setCronManual,
    cronExpr,
    setCronExpr,
    cronState,
    setCronState,
    cronBuilt,
    dirty,
    saving,
    scanning,
    handleSave,
    handleScanAndEnqueue,
    visible,
  } = useScheduler();

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scheduler</h1>
          <p className="mt-1 text-sm text-gray-600">
            Config + runtime (GET /updates/scheduler/scheduler). Auto-refresh:{" "}
            {visible ? "ON" : "OFF (aba oculta)"}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => refetch()} disabled={isFetching} type="button">
            Recarregar
          </Button>

          <Button
            variant="primary"
            onClick={handleScanAndEnqueue}
            disabled={loading || scanning}
            type="button"
          >
            {scanning ? "Executando..." : "Scan & enqueue"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RuntimeCard rt={rt} />

        <Card className="lg:col-span-2">
          <CardHeader
            title="Config"
            subtitle="Salvar via PATCH /updates/scheduler/config"
            right={
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!cfg || !dirty || saving}
                type="button"
              >
                {saving ? "Salvando..." : dirty ? "Salvar" : "Sem mudanças"}
              </Button>
            }
          />

          <div className="p-4 grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Enabled</div>
                  <div className="text-xs text-gray-500">Habilita o scheduler</div>
                </div>
              </label>

              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-gray-900">mode</div>
                <div className="mt-2">
                  <Select value={mode} onChange={(e) => setMode(e.target.value as SchedulerMode)}>
                    <option value="scan_only">scan_only</option>
                    <option value="scan_and_update">scan_and_update</option>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-gray-900">scope</div>
                <div className="mt-2">
                  <Select value={scope} onChange={(e) => setScope(e.target.value as SchedulerScope)}>
                    <option value="all">all</option>
                    <option value="labeled">labeled</option>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-gray-900">scanLabelKey</div>
                <div className="mt-2">
                  <Input value={scanLabelKey} onChange={(e) => setScanLabelKey(e.target.value)} />
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-gray-900">updateLabelKey</div>
                <div className="mt-2">
                  <Input value={updateLabelKey} onChange={(e) => setUpdateLabelKey(e.target.value)} />
                </div>
              </div>
            </div>

            <CronBuilder
              cronManual={cronManual}
              setCronManual={setCronManual}
              cronState={cronState}
              setCronState={setCronState}
              cronBuilt={cronBuilt}
              cronExpr={cronExpr}
              setCronExpr={setCronExpr}
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-gray-600">config.running</div>
                <div className="mt-1">
                  {cfg ? <BoolBadge value={!!cfg.running} toneTrue="blue" toneFalse="gray" /> : "—"}
                </div>
              </div>

              <div className="rounded-lg border p-3 text-sm">
                <div className="text-gray-600">config.lastRunAt</div>
                <div className="mt-1 text-gray-900">{fmt(cfg?.lastRunAt ?? null)}</div>
              </div>

              <div className="rounded-lg border p-3 text-sm">
                <div className="text-gray-600">config.lockedAt</div>
                <div className="mt-1 text-gray-900">{fmt(cfg?.lockedAt ?? null)}</div>
              </div>

              <div className="rounded-lg border p-3 text-sm">
                <div className="text-gray-600">config.lockedBy</div>
                <div className="mt-1 font-mono text-xs text-gray-900 truncate">
                  {cfg?.lockedBy ?? "—"}
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              createdAt: <span className="font-mono">{cfg?.createdAt ?? "—"}</span>
              {" • "}
              updatedAt: <span className="font-mono">{cfg?.updatedAt ?? "—"}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
