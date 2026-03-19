import { Bot, Clock3, RefreshCcw, ScanSearch, ShieldCheck } from "lucide-react";

import { ActionBar } from "../../components/product/action-bar";
import { FormField } from "../../components/product/form-field";
import { PageHeader } from "../../components/product/page-header";
import { SectionCard } from "../../components/product/section-card";
import { StatCard } from "../../components/product/stat-card";
import { StatusBadge } from "../../components/product/status-badge";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { type SchedulerMode, type SchedulerScope } from "../../features/scheduler/api/scheduler";
import { CronBuilder } from "../../features/scheduler/components/CronBuilder";
import { RuntimeCard } from "../../features/scheduler/components/RuntimeCard";
import { useScheduler } from "../../features/scheduler/hooks/useScheduler";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString();
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
    scheduleMode,
    setScheduleMode,
    cronExpr,
    setCronExpr,
    guidedSchedule,
    setGuidedSchedule,
    effectiveCron,
    schedulePreview,
    dirty,
    saving,
    scanning,
    handleSave,
    handleScanAndEnqueue,
    visible,
  } = useScheduler();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automation"
        title="Scheduler Control"
        description="Ajuste a recorrência principal do scheduler com presets simples e mantenha o cron avançado separado para casos customizados."
        meta={
          <>
            <Badge variant="outline">{visible ? "Auto-refresh ON" : "Auto-refresh OFF"}</Badge>
            <Badge variant={schedulePreview.isCustom ? "warning" : "info"}>
              {schedulePreview.isCustom ? "Cron customizado" : "Recorrência guiada"}
            </Badge>
            <Badge variant="outline">{rt?.timeZone ?? "UTC"}</Badge>
          </>
        }
        actions={
          <ActionBar className="justify-end">
            <Button onClick={() => refetch()} disabled={isFetching} type="button" variant="outline">
              <RefreshCcw className="size-4" />
              Recarregar
            </Button>

            <Button
              variant="primary"
              onClick={handleScanAndEnqueue}
              disabled={loading || scanning}
              type="button"
            >
              <ScanSearch className="size-4" />
              {scanning ? "Executando..." : "Scan & enqueue"}
            </Button>
          </ActionBar>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Enabled"
          value={<StatusBadge value={enabled} />}
          helper="Estado atual do agendador."
          icon={ShieldCheck}
          tone={enabled ? "success" : "warning"}
        />
        <StatCard label="Mode" value={mode} helper="Estratégia usada pelo scan." icon={Bot} tone="info" />
        <StatCard label="Scope" value={scope} helper="Escopo monitorado pelo scheduler." icon={Clock3} />
        <StatCard
          label="Editor"
          value={scheduleMode === "guided" ? "Guiado" : "Avançado"}
          helper={schedulePreview.summary}
          icon={ScanSearch}
          tone={schedulePreview.isCustom ? "warning" : "default"}
        />
      </div>

      <SectionCard
        title="Quando executar"
        description="Escolha uma recorrência rápida para o scheduler. O save continua persistindo apenas a cron final."
        actions={
          <Button variant="primary" onClick={handleSave} disabled={!cfg || !dirty || saving} type="button">
            {saving ? "Salvando..." : dirty ? "Salvar mudanças" : "Sem mudanças"}
          </Button>
        }
      >
        <CronBuilder
          scheduleMode={scheduleMode}
          setScheduleMode={setScheduleMode}
          guidedSchedule={guidedSchedule}
          setGuidedSchedule={setGuidedSchedule}
          cronExpr={cronExpr}
          setCronExpr={setCronExpr}
          effectiveCron={effectiveCron}
          timeZone={rt?.timeZone}
        />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Execução e filtros"
          description="Parâmetros técnicos do scheduler, mantidos separados da escolha de período."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="border-border/60 bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">Enabled</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Habilita o scheduler e o loop de varredura.
                  </div>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
            </Card>

            <FormField label="Mode" description="Define se o scheduler só escaneia ou também enfileira updates.">
              <Select
                value={mode}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  setMode(event.target.value as SchedulerMode)
                }
              >
                <option value="scan_only">scan_only</option>
                <option value="scan_and_update">scan_and_update</option>
              </Select>
            </FormField>

            <FormField label="Scope" description="Todos os containers ou somente os etiquetados.">
              <Select
                value={scope}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  setScope(event.target.value as SchedulerScope)
                }
              >
                <option value="all">all</option>
                <option value="labeled">labeled</option>
              </Select>
            </FormField>

            <FormField label="scanLabelKey" description="Label usada para filtrar scans quando o escopo é `labeled`.">
              <Input
                value={scanLabelKey}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setScanLabelKey(event.target.value)}
              />
            </FormField>

            <FormField label="updateLabelKey" description="Label que controla elegibilidade de update automatizado.">
              <Input
                value={updateLabelKey}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUpdateLabelKey(event.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="border-border/60 bg-muted/20 p-4 text-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">config.running</div>
              <div className="mt-2">{cfg ? <StatusBadge value={Boolean(cfg.running)} /> : "—"}</div>
            </Card>

            <Card className="border-border/60 bg-muted/20 p-4 text-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">config.lastRunAt</div>
              <div className="mt-2 text-foreground">{fmt(cfg?.lastRunAt ?? null)}</div>
            </Card>

            <Card className="border-border/60 bg-muted/20 p-4 text-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">config.lockedAt</div>
              <div className="mt-2 text-foreground">{fmt(cfg?.lockedAt ?? null)}</div>
            </Card>

            <Card className="border-border/60 bg-muted/20 p-4 text-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">config.lockedBy</div>
              <div className="mt-2 truncate font-mono text-xs text-foreground">{cfg?.lockedBy ?? "—"}</div>
            </Card>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              createdAt: <span className="font-mono text-foreground">{cfg?.createdAt ?? "—"}</span>
            </span>
            <span>
              updatedAt: <span className="font-mono text-foreground">{cfg?.updatedAt ?? "—"}</span>
            </span>
          </div>
        </SectionCard>

        <RuntimeCard rt={rt} />
      </div>
    </div>
  );
}
